import { Request, Response, Router } from "express";
import multer from "multer";
import { ValidationError } from "../../shared/errors/AppError";
import { importCsvForDataset, type CsvImportDataset } from "./data-import.service";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

const DATASETS: CsvImportDataset[] = [
  "macro-indicators",
  "economic-events",
  "central-bank-events",
  "risk-sentiment",
  "positioning",
];

router.post("/csv", upload.single("file"), (req: Request, res: Response) => {
  const datasetRaw = typeof req.body.dataset === "string" ? req.body.dataset : "";
  const dataset = datasetRaw.trim() as CsvImportDataset;

  if (!DATASETS.includes(dataset)) {
    throw new ValidationError(`dataset must be one of: ${DATASETS.join(", ")}`);
  }

  if (!req.file) {
    throw new ValidationError("CSV file is required (field name: file)");
  }

  const csvText = req.file.buffer.toString("utf-8");
  const result = importCsvForDataset(dataset, csvText);

  res.json(result);
});

export default router;
