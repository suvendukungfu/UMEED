/**
 * Evidence and Provenance Module (Phase 2 & 3 Foundation)
 */
export interface StoredEvidence {
  evidence_id: string;
  source_type: "citizen_upload" | "crawler_media";
  file_type: "image" | "video" | "audio" | "text";
  storage_path: string;
  content_hash?: string;
  created_at: string;
}

