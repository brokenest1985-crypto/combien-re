import "server-only";
import datasetDocument from "../../data-sources/reunion-tariff/2026-06-12/dataset.json";
import { parseRegionTariffDataset } from "@/domain/tariffs/reunion-region";

export const ACTIVE_REGION_REUNION_TARIFF = parseRegionTariffDataset(datasetDocument);
