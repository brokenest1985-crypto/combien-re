import { lookupRegionReunionTariff } from "@/domain/tariffs/reunion-region";
import { ACTIVE_REGION_REUNION_TARIFF } from "@/server/reunion-tariff-dataset";

export const runtime = "nodejs";

export function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  const result = lookupRegionReunionTariff({
    nomenclatureCode: parameters.get("code") ?? "",
    referenceDate: parameters.get("date") ?? "",
    dataset: ACTIVE_REGION_REUNION_TARIFF,
  });
  return Response.json(
    { datasetStatus: "available", result },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
