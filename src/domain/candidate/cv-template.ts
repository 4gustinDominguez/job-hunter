export const CV_TEMPLATES = ["classic"] as const;

export type CvTemplateName = (typeof CV_TEMPLATES)[number];

export const CV_TEMPLATE_PHOTO_SHAPES = ["square", "rounded", "round"] as const;
export type CvTemplatePhotoShape = (typeof CV_TEMPLATE_PHOTO_SHAPES)[number];

export const CV_TEMPLATE_PHOTO_POSITIONS = ["left", "right", "top"] as const;
export type CvTemplatePhotoPosition = (typeof CV_TEMPLATE_PHOTO_POSITIONS)[number];

export const CV_TEMPLATE_FIELD_KEYS = [
  "photo",
  "email",
  "phone",
  "location",
  "links",
  "projectUrls",
  "dates",
  "used",
  "builtWith",
  "highlights",
] as const;

export type CvTemplateField = (typeof CV_TEMPLATE_FIELD_KEYS)[number];

/** Per-field show/hide switches of the template header/content. */
export type CvTemplateFields = Record<CvTemplateField, boolean>;

export interface CvTemplateConfig {
  template: CvTemplateName;
  /** Photo URL for the header — presentation only, nothing is stored. */
  imageUrl: string;
  /** Custom headline; empty = the most recent position (computed). */
  headline: string;
  photoShape: CvTemplatePhotoShape;
  photoPosition: CvTemplatePhotoPosition;
  fields: CvTemplateFields;
}

export function defaultCvTemplate(): CvTemplateConfig {
  return {
    template: "classic",
    imageUrl: "",
    headline: "",
    photoShape: "square",
    photoPosition: "right",
    fields: {
      photo: true,
      email: true,
      phone: true,
      location: true,
      links: true,
      projectUrls: true,
      dates: true,
      used: true,
      builtWith: true,
      highlights: true,
    },
  };
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value);
}

/**
 * Makes any stored value usable: unknown template/photo/fields fall back to
 * defaults, partial field maps are completed — /cv and the builder never have
 * to handle a stale or partial config.
 */
export function normalizeCvTemplate(input: unknown): CvTemplateConfig {
  const base = defaultCvTemplate();
  if (typeof input !== "object" || input === null || Array.isArray(input)) return base;

  const raw = input as {
    template?: unknown;
    imageUrl?: unknown;
    headline?: unknown;
    photoShape?: unknown;
    photoPosition?: unknown;
    fields?: unknown;
  };

  const template =
    typeof raw.template === "string" && (CV_TEMPLATES as readonly string[]).includes(raw.template)
      ? (raw.template as CvTemplateName)
      : base.template;
  const imageUrl =
    typeof raw.imageUrl === "string" && isHttpUrl(raw.imageUrl.trim()) ? raw.imageUrl.trim() : "";
  const headline = typeof raw.headline === "string" ? raw.headline.trim().slice(0, 120) : "";
  const photoShape =
    typeof raw.photoShape === "string" &&
    (CV_TEMPLATE_PHOTO_SHAPES as readonly string[]).includes(raw.photoShape)
      ? (raw.photoShape as CvTemplatePhotoShape)
      : base.photoShape;
  const photoPosition =
    typeof raw.photoPosition === "string" &&
    (CV_TEMPLATE_PHOTO_POSITIONS as readonly string[]).includes(raw.photoPosition)
      ? (raw.photoPosition as CvTemplatePhotoPosition)
      : base.photoPosition;

  const fields = { ...base.fields };
  if (typeof raw.fields === "object" && raw.fields !== null && !Array.isArray(raw.fields)) {
    for (const key of CV_TEMPLATE_FIELD_KEYS) {
      const value = (raw.fields as Record<string, unknown>)[key];
      if (typeof value === "boolean") fields[key] = value;
    }
  }

  return { template, imageUrl, headline, photoShape, photoPosition, fields };
}
