const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const SavingsGoal = require("../models/SavingsGoal");
const logger = require("../utils/logger");

// ───────── Helpers ─────────

function normalizeDescription(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function guessCategory(description = "") {
  const text = normalizeDescription(description);

  const rules = [
    { category: "Food", words: ["zomato", "swiggy", "restaurant", "food", "hotel", "grocery", "groceries", "kitchen", "bakery", "cafe", "dominos", "pizza", "burger", "biryani"] },
    { category: "Transport", words: ["uber", "ola", "rapido", "fuel", "petrol", "diesel", "metro", "bus", "train", "cab", "auto", "parking", "toll"] },
    { category: "Entertainment", words: ["netflix", "prime video", "hotstar", "disney", "movie", "cinema", "spotify", "youtube", "gaming", "jio cinema"] },
    { category: "Bills", words: ["electricity", "water bill", "internet", "wifi", "broadband", "mobile recharge", "recharge", "airtel", "jio", "bsnl", "gas bill"] },
    { category: "Shopping", words: ["amazon", "flipkart", "shopping", "myntra", "meesho", "ajio", "nykaa", "clothing"] },
    { category: "Healthcare", words: ["hospital", "pharmacy", "medicine", "medical", "doctor", "clinic", "apollo", "lab", "diagnostic"] },
    { category: "Education", words: ["school", "college", "tuition", "course", "udemy", "coursera", "book", "stationery"] },
    { category: "Rent", words: ["rent", "house rent", "maintenance", "society"] },
    { category: "Investment", words: ["mutual fund", "sip", "stock", "zerodha", "groww", "investment", "fd", "ppf", "nps"] }
  ];

  for (const rule of rules) {
    if (rule.words.some(word => text.includes(word))) {
      return rule.category;
    }
  }

  return "Other";
}

// ───────── Core Analytics ─────────

async function getSummary(userId) {
  const transactions = await Transaction.find({ userId }).sort({ date: -1 });

  const income = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;
  const savingsRate = income > 0 ? Number(((balance / income) * 100).toFixed(2)) : 0;

  // Category breakdown
  const byCategory = {};
  for (const t of transactions.filter(t => t.type === "expense")) {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  }

  // Monthly breakdown (fixes the missing monthly chart bug)
  const monthly = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthly[key]) monthly[key] = { income: 0, expenses: 0 };
    if (t.type === "income") monthly[key].income += t.amount;
    if (t.type === "expense") monthly[key].expenses += t.amount;
  }

  return {
    income,
    expenses,
    balance,
    savingsRate,
    byCategory,
    monthly,
    recentTransactions: transactions.slice(0, 10)
  };
}

async function getRecurringExpenses(userId) {
  const expenses = await Transaction.find({
    userId,
    type: "expense"
  }).sort({ date: 1 });

  const groups = {};

  for (const expense of expenses) {
    const key = normalizeDescription(expense.description) || `category:${expense.category}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(expense);
  }

  const result = [];

  for (const [description, items] of Object.entries(groups)) {
    if (items.length < 3) continue;

    const amounts = items.map(x => x.amount);
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    const dates = items.map(x => new Date(x.date).getTime());
    let frequency = "unknown";

    if (dates.length >= 3) {
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

      if (avgGap >= 5 && avgGap <= 10) frequency = "weekly";
      if (avgGap >= 25 && avgGap <= 35) frequency = "monthly";
    }

    result.push({
      description,
      averageAmount: Number(average.toFixed(2)),
      occurrences: items.length,
      frequency,
      lastSeen: items[items.length - 1].date
    });
  }

  return result;
}

// ───────── Anomaly Detection ─────────

function detectAnomalies(transactions) {
  const anomalies = [];
  const byCategory = {};

  // Build average per category
  for (const t of transactions.filter(t => t.type === "expense")) {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t.amount);
  }

  for (const [category, amounts] of Object.entries(byCategory)) {
    if (amounts.length < 3) continue;
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const threshold = avg * 2;

    for (const t of transactions.filter(
      tx => tx.type === "expense" && tx.category === category && tx.amount > threshold
    )) {
      anomalies.push({
        description: t.description,
        amount: t.amount,
        category,
        averageForCategory: Math.round(avg),
        date: t.date
      });
    }
  }

  return anomalies;
}

// ───────── Monthly Trends ─────────

function getMonthlyTrends(monthly) {
  const months = Object.keys(monthly).sort();
  const trends = [];

  for (let i = 1; i < months.length; i++) {
    const prev = monthly[months[i - 1]];
    const curr = monthly[months[i]];
    const expenseChange = prev.expenses > 0
      ? Number((((curr.expenses - prev.expenses) / prev.expenses) * 100).toFixed(1))
      : 0;

    trends.push({
      month: months[i],
      previousMonth: months[i - 1],
      expenseChange,
      direction: expenseChange > 0 ? "increased" : expenseChange < 0 ? "decreased" : "unchanged"
    });
  }

  return trends;
}

// ───────── Insights Engine ─────────

async function getInsights(userId) {
  const summary = await getSummary(userId);
  const recurring = await getRecurringExpenses(userId);
  const insights = [];

  // Fetch all transactions for anomaly detection
  const allTransactions = await Transaction.find({ userId });
  const anomalies = detectAnomalies(allTransactions);

  // No income warning
  if (summary.income === 0) {
    insights.push("📊 No income has been detected yet. Import a bank statement to analyze your cash flow.");
  }

  // Low savings rate
  if (summary.savingsRate < 10 && summary.income > 0) {
    insights.push(
      `⚠️ Your current savings rate is ${summary.savingsRate}%. The recommended minimum is 20%. Review your largest spending categories to create more savings room.`
    );
  } else if (summary.savingsRate >= 10 && summary.savingsRate < 20 && summary.income > 0) {
    insights.push(
      `📈 Your savings rate is ${summary.savingsRate}%. You're getting close to the recommended 20% — keep optimizing!`
    );
  } else if (summary.savingsRate >= 20 && summary.income > 0) {
    insights.push(
      `✅ Great discipline! Your savings rate is ${summary.savingsRate}%, above the recommended 20%.`
    );
  }

  // Food spending alert
  if (summary.byCategory.Food && summary.income > 0 && summary.byCategory.Food > summary.income * 0.2) {
    insights.push(
      `🍔 Food spending is ₹${Math.round(summary.byCategory.Food)}, which is above 20% of your income. Consider meal planning to reduce this.`
    );
  }

  // Recurring expenses
  if (recurring.length > 0) {
    const recurringTotal = recurring.reduce((sum, item) => sum + item.averageAmount, 0);
    insights.push(
      `🔄 ${recurring.length} recurring expense pattern(s) detected, averaging about ₹${Math.round(recurringTotal)} per cycle. Review subscriptions you may no longer need.`
    );
  }

  // Anomaly alerts
  for (const anomaly of anomalies.slice(0, 3)) {
    insights.push(
      `🚨 Unusual expense detected: "${anomaly.description}" at ₹${anomaly.amount} is more than 2× the average of ₹${anomaly.averageForCategory} for ${anomaly.category}.`
    );
  }

  // Budget analysis with warnings
  const budgets = await Budget.find({ userId });
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  for (const budget of budgets.filter(b => b.month === month)) {
    const categorySpent = summary.byCategory[budget.category] || 0;
    const utilization = budget.amount > 0 ? (categorySpent / budget.amount) * 100 : 0;

    if (categorySpent > budget.amount) {
      insights.push(
        `🔴 You are ₹${Math.round(categorySpent - budget.amount)} over your ${budget.category} budget for ${month}. Consider cutting back next month.`
      );
    } else if (utilization >= 80) {
      insights.push(
        `🟡 Warning: ${budget.category} budget is ${utilization.toFixed(0)}% used (₹${Math.round(categorySpent)} of ₹${budget.amount}). You have ₹${Math.round(budget.amount - categorySpent)} remaining.`
      );
    } else {
      const remaining = budget.amount - categorySpent;
      insights.push(
        `🟢 You have ₹${Math.round(remaining)} left in your ${budget.category} budget for ${month} (${utilization.toFixed(0)}% used).`
      );
    }
  }

  // Savings goal tracking
  const goals = await SavingsGoal.find({ userId });
  for (const goal of goals) {
    const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
    const today = new Date();
    const target = new Date(goal.targetDate);
    const monthsLeft = Math.max(
      1,
      (target.getFullYear() - today.getFullYear()) * 12 +
      (target.getMonth() - today.getMonth())
    );
    const monthlyNeeded = remaining / monthsLeft;
    const progress = goal.targetAmount > 0
      ? ((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)
      : 0;

    insights.push(
      `🎯 "${goal.name}" is ${progress}% complete. Save ~₹${Math.round(monthlyNeeded)}/month over ${monthsLeft} month(s) to reach your target of ₹${goal.targetAmount}.`
    );
  }

  // Monthly trends
  const trends = getMonthlyTrends(summary.monthly);
  for (const trend of trends.slice(-2)) {
    if (trend.expenseChange > 10) {
      insights.push(
        `📈 Spending ${trend.direction} by ${Math.abs(trend.expenseChange)}% from ${trend.previousMonth} to ${trend.month}. Watch for lifestyle creep.`
      );
    } else if (trend.expenseChange < -10) {
      insights.push(
        `📉 Great progress! Spending ${trend.direction} by ${Math.abs(trend.expenseChange)}% from ${trend.previousMonth} to ${trend.month}.`
      );
    }
  }

  if (insights.length === 0) {
    insights.push("💡 Add more transactions so the coach can identify stronger patterns and recommendations.");
  }

  return {
    summary,
    recurring,
    anomalies,
    trends,
    insights
  };
}

module.exports = {
  guessCategory,
  getSummary,
  getRecurringExpenses,
  getInsights,
  detectAnomalies,
  getMonthlyTrends
};
