const express = require("express");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const router = express.Router();

const Transaction = require("../models/Transaction");
const { guessCategory } = require("../services/financeAnalysis");

const upload = multer({ storage: multer.memoryStorage() });

function detectType(row) {
  const rawType = String(row.type || row.Type || "").trim().toLowerCase();

  if (["credit", "income", "cr", "deposit"].includes(rawType)) {
    return "income";
  }

  if (["debit", "expense", "dr", "withdrawal"].includes(rawType)) {
    return "expense";
  }

  const amount = Number(row.amount ?? row.Amount ?? 0);

  return amount >= 0 ? "income" : "expense";
}

function detectAmount(row) {
  const value = Number(row.amount ?? row.Amount ?? 0);
  return Math.abs(value);
}

/**
 * Parse dates in multiple formats including Indian bank CSV formats.
 * Supports: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, and ISO strings.
 */
function parseDate(dateValue) {
  if (!dateValue) return new Date();

  const str = String(dateValue).trim();

  // DD/MM/YYYY or DD-MM-YYYY (Indian bank format)
  const ddmmyyyy = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    // If day > 12, it's definitely DD/MM/YYYY
    if (Number(day) > 12) {
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    // If month > 12, it's MM/DD/YYYY
    if (Number(month) > 12) {
      return new Date(Number(year), Number(day) - 1, Number(month));
    }
    // Ambiguous: default to DD/MM/YYYY (Indian convention)
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  // Fallback: let JS parse it (handles YYYY-MM-DD, ISO, etc.)
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

router.post("/csv", upload.single("file"), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const rows = parse(req.file.buffer.toString("utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const transactions = rows.map(row => {
      const description =
        row.description ??
        row.Description ??
        row.narration ??
        row.Narration ??
        "";

      const dateValue = row.date ?? row.Date ?? null;

      return {
        userId,
        amount: detectAmount(row),
        type: detectType(row),
        description,
        category:
          String(row.category ?? row.Category ?? "").trim() ||
          (detectType(row) === "expense" ? guessCategory(description) : "Income"),
        date: parseDate(dateValue),
        source: "imported"
      };
    });

    if (transactions.length === 0) {
      return res.status(400).json({ message: "No transactions found in CSV" });
    }

    const inserted = await Transaction.insertMany(transactions);

    res.status(201).json({
      message: `${inserted.length} transactions imported`,
      transactions: inserted
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not import CSV",
      error: error.message
    });
  }
});

module.exports = router;
