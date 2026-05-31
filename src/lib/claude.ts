const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL_NAME = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

export interface CategoryResult {
  description: string;
  category: string;
  confidence: number;
}

// Fallback keyword-based matching for local development without API key
function getFallbackCategory(description: string): { category: string; confidence: number } {
  const desc = description.toLowerCase();
  
  if (desc.includes('flight') || desc.includes('united') || desc.includes('airlines') || desc.includes('uber') || desc.includes('hotel') || desc.includes('taxi') || desc.includes('travel')) {
    return { category: 'travel', confidence: 0.85 };
  }
  if (desc.includes('staples') || desc.includes('office') || desc.includes('depot') || desc.includes('paper') || desc.includes('supplies') || desc.includes('pencil') || desc.includes('marker')) {
    return { category: 'supplies', confidence: 0.90 };
  }
  if (desc.includes('internet') || desc.includes('electricity') || desc.includes('power') || desc.includes('water') || desc.includes('gas') || desc.includes('bill') || desc.includes('utility') || desc.includes('utilities') || desc.includes('comcast') || desc.includes('electric')) {
    return { category: 'utilities', confidence: 0.95 };
  }
  if (desc.includes('payroll') || desc.includes('salary') || desc.includes('wages') || desc.includes('bonus') || desc.includes('payroll') || desc.includes('direct deposit')) {
    return { category: 'payroll', confidence: 0.95 };
  }
  if (desc.includes('tax') || desc.includes('irs') || desc.includes('refund') || desc.includes('state tax')) {
    return { category: 'tax', confidence: 0.95 };
  }
  if (desc.includes('consulting') || desc.includes('consultant') || desc.includes('contractor') || desc.includes('advisory')) {
    return { category: 'consulting', confidence: 0.80 };
  }
  if (desc.includes('marketing') || desc.includes('ads') || desc.includes('facebook') || desc.includes('google ads') || desc.includes('campaign') || desc.includes('promo')) {
    return { category: 'marketing', confidence: 0.90 };
  }
  if (desc.includes('legal') || desc.includes('law') || desc.includes('attorney') || desc.includes('counsel') || desc.includes('lawyer')) {
    return { category: 'legal', confidence: 0.95 };
  }
  if (desc.includes('rent') || desc.includes('lease') || desc.includes('office space') || desc.includes('landlord')) {
    return { category: 'rent', confidence: 0.95 };
  }
  if (desc.includes('insurance') || desc.includes('geico') || desc.includes('blue cross') || desc.includes('medical')) {
    return { category: 'insurance', confidence: 0.90 };
  }
  if (desc.includes('maintenance') || desc.includes('repair') || desc.includes('cleaning') || desc.includes('janitorial')) {
    return { category: 'maintenance', confidence: 0.85 };
  }
  if (desc.includes('restaurant') || desc.includes('lunch') || desc.includes('dinner') || desc.includes('meals') || desc.includes('starbucks') || desc.includes('cafe') || desc.includes('food')) {
    return { category: 'meals', confidence: 0.80 };
  }
  if (desc.includes('equipment') || desc.includes('computer') || desc.includes('laptop') || desc.includes('aws') || desc.includes('software') || desc.includes('server')) {
    return { category: 'equipment', confidence: 0.80 };
  }
  
  return { category: 'other', confidence: 0.50 };
}

export async function categorizeTransactions(descriptions: string[]): Promise<CategoryResult[]> {
  if (!descriptions || descriptions.length === 0) return [];

  // If no Claude API key, use fallback rule engine
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === '') {
    console.log('[CLAUDE] No API key configured. Using local keyword-matching engine.');
    return descriptions.map(desc => {
      const match = getFallbackCategory(desc);
      return {
        description: desc,
        category: match.category,
        confidence: match.confidence,
      };
    });
  }

  try {
    const prompt = `You are an accounting categorization expert. Given the following list of transaction descriptions, categorize each into ONE of these categories: consulting, travel, supplies, utilities, payroll, tax, equipment, marketing, legal, insurance, rent, maintenance, meals, other.

Format your response as a JSON array where each item has: 
{
  "description": "original description",
  "category": "category name",
  "confidence": 0.95
}

Transactions:
${descriptions.map(d => `- ${d}`).join('\n')}

Only respond with valid JSON, no other text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API returned status ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    const responseText = responseData.content[0].text;
    
    // Parse the response text as JSON
    const parsed = JSON.parse(responseText.trim());
    return parsed as CategoryResult[];
  } catch (error) {
    console.error('[CLAUDE_CATEGORIZE_ERROR] Error calling Claude API:', error);
    console.log('[CLAUDE] Falling back to keyword-matching engine due to error.');
    
    return descriptions.map(desc => {
      const match = getFallbackCategory(desc);
      return {
        description: desc,
        category: match.category,
        confidence: match.confidence,
      };
    });
  }
}

export interface GeneratedReport {
  statement: any;
  summary: string;
  insights: string[];
}

export async function generateFinancialReport(
  companyName: string,
  startDateStr: string,
  endDateStr: string,
  type: string,
  aggregatedData: any
): Promise<GeneratedReport> {
  let prompt = '';

  if (type === 'balance_sheet') {
    prompt = `You are a professional financial analyst. Generate a professional Balance Sheet for ${companyName} as of ${endDateStr}.
  
Use the following transaction aggregates up to the end date:
${JSON.stringify(aggregatedData, null, 2)}

Generate:
1. A formatted Balance Sheet (JSON format with sections for assets, liabilities, and equity, including totals and matching balance check)
2. A 3-paragraph executive summary highlighting key metrics and trends
3. 3-5 key insights/observations about the company's financial position

Format as JSON:
{
  "statement": {
    "assets": {
      "cash": number,
      "accountsReceivable": number,
      "equipment": number,
      "totalAssets": number
    },
    "liabilities": {
      "accountsPayable": number,
      "creditCard": number,
      "totalLiabilities": number
    },
    "equity": {
      "paidInCapital": number,
      "retainedEarnings": number,
      "totalEquity": number
    }
  },
  "summary": "Executive summary text",
  "insights": ["insight 1", "insight 2", ...]
}

Only respond with valid JSON.`;
  } else if (type === 'cash_flow') {
    prompt = `You are a professional financial analyst. Generate a professional Cash Flow Statement for ${companyName} for the period from ${startDateStr} to ${endDateStr}.
  
Use the following transaction aggregates and cash reconciliation numbers:
${JSON.stringify(aggregatedData, null, 2)}

Generate:
1. A formatted Cash Flow Statement (JSON format with sections for operating activities, investing activities, financing activities, net change, and reconciliation of beginning to ending cash)
2. A 3-paragraph executive summary highlighting key cash flow patterns and liquidity observations
3. 3-5 key insights/observations about the company's cash flow dynamics and cash runway

Format as JSON:
{
  "statement": {
    "operating": {
      "receipts": number,
      "payments": number,
      "netOperating": number
    },
    "investing": {
      "equipment": number,
      "netInvesting": number
    },
    "financing": {
      "transfers": number,
      "netFinancing": number
    },
    "totals": {
      "beginningCash": number,
      "netChange": number,
      "endingCash": number
    }
  },
  "summary": "Executive summary text",
  "insights": ["insight 1", "insight 2", ...]
}

Only respond with valid JSON.`;
  } else if (type === 'shareholders_equity') {
    prompt = `You are a professional financial analyst. Generate a professional Statement of Shareholders' Equity for ${companyName} for the period from ${startDateStr} to ${endDateStr}.
  
Use the following transaction aggregates and equity account balances:
${JSON.stringify(aggregatedData, null, 2)}

Generate:
1. A formatted Statement of Shareholders' Equity (JSON format with sections for beginning balances, changes during the period [Net Income, Contributions, Distributions], and ending balances for paid-in capital, retained earnings, and total equity)
2. A 3-paragraph executive summary highlighting changes in equity, contributions, dividend payouts (if any), and net earnings retention
3. 3-5 key insights/observations about the company's equity growth and capital structure

Format as JSON:
{
  "statement": {
    "beginning": {
      "paidInCapital": number,
      "retainedEarnings": number,
      "totalEquity": number
    },
    "changes": {
      "netIncome": number,
      "contributions": number,
      "distributions": number
    },
    "ending": {
      "paidInCapital": number,
      "retainedEarnings": number,
      "totalEquity": number
    }
  },
  "summary": "Executive summary text",
  "insights": ["insight 1", "insight 2", ...]
}

Only respond with valid JSON.`;
  } else {
    prompt = `You are a professional financial analyst. Generate a professional income statement for ${companyName} for the period ${startDateStr} to ${endDateStr}.

Use the following transaction data:
${JSON.stringify(aggregatedData, null, 2)}

Generate:
1. A formatted Income Statement (JSON format with line items, subtotals, net income)
2. A 3-paragraph executive summary highlighting key metrics and trends
3. 3-5 key insights/observations about the company's financial health

Format as JSON:
{
  "statement": { ... financial data as JSON ... },
  "summary": "Executive summary text",
  "insights": ["insight 1", "insight 2", ...]
}

Only respond with valid JSON.`;
  }

  // Fallback mock report generator if no Claude API key
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === '') {
    console.log(`[CLAUDE] No API key configured. Using local report-generator fallback for ${type}.`);
    
    if (type === 'balance_sheet') {
      const assets = {
        cash: Number(aggregatedData.assets.cash),
        accountsReceivable: Number(aggregatedData.assets.accountsReceivable),
        equipment: Number(aggregatedData.assets.equipment),
        totalAssets: Number(aggregatedData.assets.totalAssets)
      };
      const liabilities = {
        accountsPayable: Number(aggregatedData.liabilities.accountsPayable),
        creditCard: Number(aggregatedData.liabilities.creditCard),
        totalLiabilities: Number(aggregatedData.liabilities.totalLiabilities)
      };
      const equity = {
        paidInCapital: Number(aggregatedData.equity.paidInCapital),
        retainedEarnings: Number(aggregatedData.equity.retainedEarnings),
        totalEquity: Number(aggregatedData.equity.totalEquity)
      };

      const statement = { assets, liabilities, equity };

      const summary = `Balance Sheet Analysis for ${companyName}: As of ${endDateStr}, the business maintains a total asset base of GH₵${assets.totalAssets.toLocaleString()}. The primary liquidity asset is cash, standing at GH₵${assets.cash.toLocaleString()}, indicating a strong current position.\n\nOn the funding side, total liabilities are managed at GH₵${liabilities.totalLiabilities.toLocaleString()}, driven by accounts payable and outstanding credit card balances. This leaves a solid shareholder equity foundation of GH₵${equity.totalEquity.toLocaleString()}, backed by retained earnings of GH₵${equity.retainedEarnings.toLocaleString()}.\n\nOverall, the balance sheet balances perfectly, showing that assets are safely financed with minimal long-term debt risk. Adhering to efficient collection policies will continue to convert accounts receivable quickly to sustain liquidity.`;

      const insights = [
        `Working capital ratio is highly favorable with liquid cash of GH₵${assets.cash.toLocaleString()} exceeding short-term liabilities.`,
        `Equipment assets represent a key capital allocation of GH₵${assets.equipment.toLocaleString()}.`,
        `Retained earnings of GH₵${equity.retainedEarnings.toLocaleString()} demonstrate cumulative historical profitability of operations.`
      ];

      return { statement, summary, insights };
    }

    if (type === 'cash_flow') {
      const operating = {
        receipts: Number(aggregatedData.operating.receipts),
        payments: Number(aggregatedData.operating.payments),
        netOperating: Number(aggregatedData.operating.netOperating)
      };
      const investing = {
        equipment: Number(aggregatedData.investing.equipment),
        netInvesting: Number(aggregatedData.investing.netInvesting)
      };
      const financing = {
        transfers: Number(aggregatedData.financing.transfers),
        netFinancing: Number(aggregatedData.financing.netFinancing)
      };
      const totals = {
        beginningCash: Number(aggregatedData.totals.beginningCash),
        netChange: Number(aggregatedData.totals.netChange),
        endingCash: Number(aggregatedData.totals.endingCash)
      };

      const statement = { operating, investing, financing, totals };

      const summary = `Cash Flow Analysis for ${companyName}: During the period from ${startDateStr} to ${endDateStr}, net cash from operating activities was GH₵${operating.netOperating.toLocaleString()}, representing the core cash engine of the firm. Total collections were GH₵${operating.receipts.toLocaleString()} against operating outflows of GH₵${Math.abs(operating.payments).toLocaleString()}.\n\nInvesting activities accounted for a cash outflow of GH₵${Math.abs(investing.netInvesting).toLocaleString()} due to fixed equipment purchases. Financing activities, primarily represented by account transfers, contributed a net flow of GH₵${financing.netFinancing.toLocaleString()}.\n\nOverall, the company generated a net cash change of GH₵${totals.netChange.toLocaleString()} during the period, moving from a beginning cash balance of GH₵${totals.beginningCash.toLocaleString()} to an ending balance of GH₵${totals.endingCash.toLocaleString()}, demonstrating robust liquidity management.`;

      const insights = [
        `Core operations are cash-flow positive, yielding GH₵${operating.netOperating.toLocaleString()} of operating cash flow.`,
        `Capital expenditures of GH₵${Math.abs(investing.netInvesting).toLocaleString()} represent cash reinvestment in business tools.`,
        `Ending cash balance of GH₵${totals.endingCash.toLocaleString()} provides a healthy cash cushion for ongoing commitments.`
      ];

      return { statement, summary, insights };
    }

    if (type === 'shareholders_equity') {
      const beginning = {
        paidInCapital: Number(aggregatedData.beginningBalances.paidInCapital),
        retainedEarnings: Number(aggregatedData.beginningBalances.retainedEarnings),
        totalEquity: Number(aggregatedData.beginningBalances.totalEquity)
      };
      const changes = {
        netIncome: Number(aggregatedData.changes.netIncome),
        contributions: Number(aggregatedData.changes.contributions),
        distributions: Number(aggregatedData.changes.distributions)
      };
      const ending = {
        paidInCapital: Number(aggregatedData.endingBalances.paidInCapital),
        retainedEarnings: Number(aggregatedData.endingBalances.retainedEarnings),
        totalEquity: Number(aggregatedData.endingBalances.totalEquity)
      };

      const statement = { beginning, changes, ending };

      const summary = `Statement of Shareholders' Equity for ${companyName}: During the period from ${startDateStr} to ${endDateStr}, the company's total equity grew to GH₵${ending.totalEquity.toLocaleString()}, starting from a beginning equity of GH₵${beginning.totalEquity.toLocaleString()}.\n\nThis increase was driven by a net income of GH₵${changes.netIncome.toLocaleString()} for the period, combined with new capital contributions of GH₵${changes.contributions.toLocaleString()}. Total distributions or dividends paid out to shareholders amounted to GH₵${changes.distributions.toLocaleString()}.\n\nOverall, the net additions to retained earnings have significantly enhanced the firm's capital reserves, confirming stable self-funding capabilities and positive financial health. The current capital structure provides a solid foundation for future operational scaling.`;

      const insights = [
        `Retained earnings increased by GH₵${(changes.netIncome - changes.distributions).toLocaleString()} during the period, reflecting strong earnings retention.`,
        `Capital contributions of GH₵${changes.contributions.toLocaleString()} show active stakeholder reinvestment and commitment.`,
        `Ending paid-in capital of GH₵${ending.paidInCapital.toLocaleString()} represents the permanent funding base of the business.`
      ];

      return { statement, summary, insights };
    }

    // Default: income_statement
    const statement = {
      periodStart: startDateStr,
      periodEnd: endDateStr,
      income: { ...aggregatedData.income },
      expenses: { ...aggregatedData.expenses },
      totals: {
        totalIncome: Object.values(aggregatedData.income || {}).reduce((a: any, b: any) => a + b, 0),
        totalExpenses: Object.values(aggregatedData.expenses || {}).reduce((a: any, b: any) => a + b, 0),
      }
    };
    statement.totals.netIncome = statement.totals.totalIncome - statement.totals.totalExpenses;

    const summary = `Executive Summary for ${companyName}: During the period from ${startDateStr} to ${endDateStr}, the business experienced solid activity. Total revenues reached GH₵${statement.totals.totalIncome.toLocaleString()} and expenses amounted to GH₵${statement.totals.totalExpenses.toLocaleString()}, leading to a net profit of GH₵${statement.totals.netIncome.toLocaleString()}.\n\nOperationally, the cost structure appears standard, with the largest costs originating from payroll and core utilities. Strategic initiatives should focus on cost optimization and expanding key client consulting revenues to drive margins.\n\nMoving forward, maintaining a clean cash runway and conducting monthly reviews will ensure financial resilience. Overall, the company is in a stable position but would benefit from strict adherence to seasonal budgets.`;

    const insights = [
      `Net Profit margin stands at ${statement.totals.totalIncome > 0 ? ((statement.totals.netIncome / statement.totals.totalIncome) * 100).toFixed(1) : 0}% for the selected period.`,
      `Payroll and consulting fees represent the primary drivers of financial outflow.`,
      `Stable operations with a total of ${Object.keys(aggregatedData.expenses || {}).length} expense categories reported.`,
    ];

    return {
      statement,
      summary,
      insights,
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API returned status ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    const responseText = responseData.content[0].text;
    
    const parsed = JSON.parse(responseText.trim());
    return parsed as GeneratedReport;
  } catch (error) {
    console.error('[CLAUDE_REPORT_ERROR] Error calling Claude API:', error);
    console.log('[CLAUDE] Falling back to local report-generator engine due to error.');
    
    // Safe fallback execution when API fails
    if (type === 'balance_sheet') {
      const assets = {
        cash: Number(aggregatedData.assets.cash),
        accountsReceivable: Number(aggregatedData.assets.accountsReceivable),
        equipment: Number(aggregatedData.assets.equipment),
        totalAssets: Number(aggregatedData.assets.totalAssets)
      };
      const liabilities = {
        accountsPayable: Number(aggregatedData.liabilities.accountsPayable),
        creditCard: Number(aggregatedData.liabilities.creditCard),
        totalLiabilities: Number(aggregatedData.liabilities.totalLiabilities)
      };
      const equity = {
        paidInCapital: Number(aggregatedData.equity.paidInCapital),
        retainedEarnings: Number(aggregatedData.equity.retainedEarnings),
        totalEquity: Number(aggregatedData.equity.totalEquity)
      };
      const statement = { assets, liabilities, equity };
      const summary = `Balance Sheet Analysis for ${companyName}: As of ${endDateStr}, the business maintains a total asset base of GH₵${assets.totalAssets.toLocaleString()}. The primary liquidity asset is cash, standing at GH₵${assets.cash.toLocaleString()}, indicating a strong current position.\n\nOn the funding side, total liabilities are managed at GH₵${liabilities.totalLiabilities.toLocaleString()}, driven by accounts payable and outstanding credit card balances. This leaves a solid shareholder equity foundation of GH₵${equity.totalEquity.toLocaleString()}, backed by retained earnings of GH₵${equity.retainedEarnings.toLocaleString()}.\n\nOverall, the balance sheet balances perfectly, showing that assets are safely financed with minimal long-term debt risk. Adhering to efficient collection policies will continue to convert accounts receivable quickly to sustain liquidity.`;
      const insights = [
        `Working capital ratio is highly favorable with liquid cash of GH₵${assets.cash.toLocaleString()} exceeding short-term liabilities.`,
        `Equipment assets represent a key capital allocation of GH₵${assets.equipment.toLocaleString()}.`,
        `Retained earnings of GH₵${equity.retainedEarnings.toLocaleString()} demonstrate cumulative historical profitability of operations.`
      ];
      return { statement, summary, insights };
    }

    if (type === 'cash_flow') {
      const operating = {
        receipts: Number(aggregatedData.operating.receipts),
        payments: Number(aggregatedData.operating.payments),
        netOperating: Number(aggregatedData.operating.netOperating)
      };
      const investing = {
        equipment: Number(aggregatedData.investing.equipment),
        netInvesting: Number(aggregatedData.investing.netInvesting)
      };
      const financing = {
        transfers: Number(aggregatedData.financing.transfers),
        netFinancing: Number(aggregatedData.financing.netFinancing)
      };
      const totals = {
        beginningCash: Number(aggregatedData.totals.beginningCash),
        netChange: Number(aggregatedData.totals.netChange),
        endingCash: Number(aggregatedData.totals.endingCash)
      };
      const statement = { operating, investing, financing, totals };
      const summary = `Cash Flow Analysis for ${companyName}: During the period from ${startDateStr} to ${endDateStr}, net cash from operating activities was GH₵${operating.netOperating.toLocaleString()}, representing the core cash engine of the firm. Total collections were GH₵${operating.receipts.toLocaleString()} against operating outflows of GH₵${Math.abs(operating.payments).toLocaleString()}.\n\nInvesting activities accounted for a cash outflow of GH₵${Math.abs(investing.netInvesting).toLocaleString()} due to fixed equipment purchases. Financing activities, primarily represented by account transfers, contributed a net flow of GH₵${financing.netFinancing.toLocaleString()}.\n\nOverall, the company generated a net cash change of GH₵${totals.netChange.toLocaleString()} during the period, moving from a beginning cash balance of GH₵${totals.beginningCash.toLocaleString()} to an ending balance of GH₵${totals.endingCash.toLocaleString()}, demonstrating robust liquidity management.`;
      const insights = [
        `Core operations are cash-flow positive, yielding GH₵${operating.netOperating.toLocaleString()} of operating cash flow.`,
        `Capital expenditures of GH₵${Math.abs(investing.netInvesting).toLocaleString()} represent cash reinvestment in business tools.`,
        `Ending cash balance of GH₵${totals.endingCash.toLocaleString()} provides a healthy cash cushion for ongoing commitments.`
      ];
      return { statement, summary, insights };
    }

    if (type === 'shareholders_equity') {
      const beginning = {
        paidInCapital: Number(aggregatedData.beginningBalances.paidInCapital),
        retainedEarnings: Number(aggregatedData.beginningBalances.retainedEarnings),
        totalEquity: Number(aggregatedData.beginningBalances.totalEquity)
      };
      const changes = {
        netIncome: Number(aggregatedData.changes.netIncome),
        contributions: Number(aggregatedData.changes.contributions),
        distributions: Number(aggregatedData.changes.distributions)
      };
      const ending = {
        paidInCapital: Number(aggregatedData.endingBalances.paidInCapital),
        retainedEarnings: Number(aggregatedData.endingBalances.retainedEarnings),
        totalEquity: Number(aggregatedData.endingBalances.totalEquity)
      };

      const statement = { beginning, changes, ending };

      const summary = `Statement of Shareholders' Equity for ${companyName}: During the period from ${startDateStr} to ${endDateStr}, the company's total equity grew to GH₵${ending.totalEquity.toLocaleString()}, starting from a beginning equity of GH₵${beginning.totalEquity.toLocaleString()}.\n\nThis increase was driven by a net income of GH₵${changes.netIncome.toLocaleString()} for the period, combined with new capital contributions of GH₵${changes.contributions.toLocaleString()}. Total distributions or dividends paid out to shareholders amounted to GH₵${changes.distributions.toLocaleString()}.\n\nOverall, the net additions to retained earnings have significantly enhanced the firm's capital reserves, confirming stable self-funding capabilities and positive financial health. The current capital structure provides a solid foundation for future operational scaling.`;

      const insights = [
        `Retained earnings increased by GH₵${(changes.netIncome - changes.distributions).toLocaleString()} during the period, reflecting strong earnings retention.`,
        `Capital contributions of GH₵${changes.contributions.toLocaleString()} show active stakeholder reinvestment and commitment.`,
        `Ending paid-in capital of GH₵${ending.paidInCapital.toLocaleString()} represents the permanent funding base of the business.`
      ];

      return { statement, summary, insights };
    }

    // Default: income_statement
    const statement = {
      periodStart: startDateStr,
      periodEnd: endDateStr,
      income: { ...aggregatedData.income },
      expenses: { ...aggregatedData.expenses },
      totals: {
        totalIncome: Object.values(aggregatedData.income || {}).reduce((a: any, b: any) => a + b, 0),
        totalExpenses: Object.values(aggregatedData.expenses || {}).reduce((a: any, b: any) => a + b, 0),
      }
    };
    statement.totals.netIncome = statement.totals.totalIncome - statement.totals.totalExpenses;
    const summary = `Executive Summary for ${companyName}: During the period from ${startDateStr} to ${endDateStr}, the business experienced solid activity. Total revenues reached GH₵${statement.totals.totalIncome.toLocaleString()} and expenses amounted to GH₵${statement.totals.totalExpenses.toLocaleString()}, leading to a net profit of GH₵${statement.totals.netIncome.toLocaleString()}.\n\nOperationally, the cost structure appears standard, with the largest costs originating from payroll and core utilities. Strategic initiatives should focus on cost optimization and expanding key client consulting revenues to drive margins.\n\nMoving forward, maintaining a clean cash runway and conducting monthly reviews will ensure financial resilience. Overall, the company is in a stable position but would benefit from strict adherence to seasonal budgets.`;
    const insights = [
      `Net Profit margin stands at ${statement.totals.totalIncome > 0 ? ((statement.totals.netIncome / statement.totals.totalIncome) * 100).toFixed(1) : 0}% for the selected period.`,
      `Payroll and consulting fees represent the primary drivers of financial outflow.`,
      `Stable operations with a total of ${Object.keys(aggregatedData.expenses || {}).length} expense categories reported.`,
    ];
    return { statement, summary, insights };
  }
}

