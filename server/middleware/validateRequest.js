/**
 * Lightweight request validation middleware factory.
 *
 * Usage:
 *   const { requireFields, requireQuery } = require("../middleware/validateRequest");
 *   router.post("/", requireFields("userId", "amount", "type"), handler);
 *   router.get("/",  requireQuery("userId"), handler);
 */

function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => req.body[f] == null || req.body[f] === "");
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`
      });
    }
    next();
  };
}

function requireQuery(...params) {
  return (req, res, next) => {
    const missing = params.filter(p => !req.query[p]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required query params: ${missing.join(", ")}`
      });
    }
    next();
  };
}

module.exports = { requireFields, requireQuery };
