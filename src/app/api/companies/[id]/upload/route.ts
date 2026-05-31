import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { parse } from 'csv-parse/sync';
import { categorizeTransactions } from '@/lib/claude';

// Helper to check if a date is valid
function isValidDate(d: any) {
  return d instanceof Date && !isNaN(d.getTime());
}

// POST /api/companies/[id]/upload - Upload transaction CSV
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: companyId } = params;

    // Verify company belongs to user's firm
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || company.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get formData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileText = await file.text();

    // Parse CSV
    let records: any[] = [];
    try {
      records = parse(fileText, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError: any) {
      return NextResponse.json({ error: `Failed to parse CSV: ${parseError.message}` }, { status: 400 });
    }

    if (records.length < 2) {
      return NextResponse.json({ error: 'CSV must contain headers and at least one transaction row' }, { status: 400 });
    }

    // Header mapping logic
    const headers = records[0].map((h: string) => h.toLowerCase());
    
    let dateIdx = -1;
    let descIdx = -1;
    let amountIdx = -1;

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header.includes('date')) dateIdx = i;
      if (header.includes('desc') || header.includes('detail') || header.includes('memo') || header.includes('trans')) descIdx = i;
      if (header.includes('amount') || header.includes('value') || header.includes('sum') || header.includes('charge')) amountIdx = i;
    }

    // If headers could not be auto-mapped, fallback to indices 0, 1, 2
    if (dateIdx === -1) dateIdx = 0;
    if (descIdx === -1) descIdx = 1;
    if (amountIdx === -1) amountIdx = 2;

    const transactionRows = records.slice(1);
    const uploadBatchId = `batch-${Date.now()}`;
    const parsedTransactions: any[] = [];

    // First, compile all descriptions for batch categorization to save token cost
    const rawDescriptions: string[] = [];

    for (const row of transactionRows) {
      // Ensure row has enough columns
      if (row.length <= Math.max(dateIdx, descIdx, amountIdx)) continue;

      const dateStr = row[dateIdx];
      const descStr = row[descIdx];
      const amountStr = row[amountIdx];

      if (!dateStr || !descStr || !amountStr) continue;

      const dateObj = new Date(dateStr);
      if (!isValidDate(dateObj)) continue;

      // Clean amount: strip dollar signs, commas
      const cleanedAmountStr = amountStr.replace(/[$,]/g, '');
      const rawAmount = parseFloat(cleanedAmountStr);

      if (isNaN(rawAmount)) continue;

      const description = descStr.trim();
      rawDescriptions.push(description);

      parsedTransactions.push({
        date: dateObj,
        description,
        rawAmount,
      });
    }

    if (parsedTransactions.length === 0) {
      return NextResponse.json({ error: 'No valid transactions found in CSV. Expected columns: Date, Description, Amount' }, { status: 400 });
    }

    const categoryMap = new Map<string, { category: string; aiGenerated: boolean }>();
    const uniqueDescriptions = Array.from(new Set(rawDescriptions));
    const descriptionsForClaude = uniqueDescriptions;

    // Only call Claude for descriptions that didn't match any rules
    if (descriptionsForClaude.length > 0) {
      try {
        const categorizationResults = await categorizeTransactions(descriptionsForClaude);
        categorizationResults.forEach((res) => {
          categoryMap.set(res.description, {
            category: res.category,
            aiGenerated: true,
          });
        });
      } catch (err) {
        console.error('Claude categorization failed, falling back to other/default', err);
        descriptionsForClaude.forEach((desc) => {
          if (!categoryMap.has(desc)) {
            categoryMap.set(desc, {
              category: 'other',
              aiGenerated: false,
            });
          }
        });
      }
    }

    // Save transactions to database
    const transactionsToInsert = parsedTransactions.map((tx) => {
      const catInfo = categoryMap.get(tx.description) || { category: 'other', aiGenerated: false };
      
      const amount = Math.abs(tx.rawAmount);
      // Determine type based on amount sign
      // Negative = expense, Positive = income
      const type = tx.rawAmount < 0 ? 'expense' : 'income';

      return {
        companyId,
        date: tx.date,
        description: tx.description,
        amount,
        originalAmount: amount,
        currency: company.currency || 'GHS',
        exchangeRate: 1.0,
        type,
        category: catInfo.category,
        categoryAiGenerated: catInfo.aiGenerated,
        uploadBatchId,
      };
    });

    // Bulk create
    const insertCount = await prisma.transaction.createMany({
      data: transactionsToInsert,
    });



    return NextResponse.json({
      success: true,
      inserted: insertCount.count,
      batchId: uploadBatchId,
      transactions: transactionsToInsert.slice(0, 10), // return first few for preview
    }, { status: 201 });

  } catch (error: any) {
    console.error('[UPLOAD_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
