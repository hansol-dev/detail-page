import { NextResponse } from "next/server";
import { processImageGenerationCut } from "@/lib/services/image-generation";
import { getCurrentUserId } from "@/lib/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string; cutNumber: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    const { jobId, cutNumber } = await params;
    const job = await processImageGenerationCut(userId, jobId, Number(cutNumber));
    return NextResponse.json({
      ok: true,
      jobId: job.id,
      status: job.status,
      completedCutCount: job.completedCutCount,
      expectedCutCount: job.expectedCutCount
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown image generation error"
      },
      { status: 500 }
    );
  }
}
