const router = require("express").Router();
const invoicingController = require("../controller/invoicesController");
const verifyToken = require("../middleware/verfiyJwt");
const multer = require("multer");
const path = require("path");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 50,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    // Accept XML and JSON files only.
    const isJson = ext === ".json" && mime === "application/json";
    const isXml =
      ext === ".xml" && (mime === "text/xml" || mime === "application/xml");

    if (isJson || isXml) {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
    }
  },
});

router.use(verifyToken);
router.post(
  "/insertmany",
  upload.array("files", 50),
  invoicingController.importLocalInvoices,
);
router.get("/summary", invoicingController.getSummary);
router.get("/accountsfromto", invoicingController.getSummaryByDate);
router.delete("/:uuid", invoicingController.softDeleteInvoice);
router.get("/stats", verifyToken, invoicingController.getInvoiceStats2);
module.exports = router;
