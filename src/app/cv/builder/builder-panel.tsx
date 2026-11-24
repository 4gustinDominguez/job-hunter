"use client";

/* oxlint-disable jsx-no-new-function-as-prop -- field toggles must close over their row; this component renders on interaction, not in a hot loop */

import { useActionState, useState } from "react";
import { ClassicTemplate } from "../../_components/cv-templates/classic";
import { PrintButton } from "../../_components/print-button";
import { saveCvTemplateAction } from "@/app/_lib/actions";
import type { CvTemplateState } from "@/app/_lib/schemas";
import type { CvLayout } from "@/domain/candidate/cv-layout";
import {
  CV_TEMPLATE_FIELD_KEYS,
  CV_TEMPLATE_PHOTO_POSITIONS,
  CV_TEMPLATE_PHOTO_SHAPES,
  type CvTemplateConfig,
  type CvTemplateField,
  type CvTemplatePhotoPosition,
  type CvTemplatePhotoShape,
} from "@/domain/candidate/cv-template";
import type { JsonResume } from "@/domain/candidate/json-resume";

const initialState: CvTemplateState = { message: "" };

const FIELD_LABELS: Record<CvTemplateField, string> = {
  photo: "Photo",
  email: "Email",
  phone: "Phone",
  location: "Location",
  projectUrls: "Project URLs",
  dates: "Dates (experience & education)",
  used: "“Used” line under each job",
  builtWith: "“Built with” line (projects)",
  highlights: "Achievement bullets",
};

const PHOTO_SHAPE_LABELS: Record<CvTemplatePhotoShape, string> = {
  square: "Square",
  rounded: "Rounded 4px",
  round: "Round",
};

const PHOTO_POSITION_LABELS: Record<CvTemplatePhotoPosition, string> = {
  left: "Left",
  right: "Right",
  top: "Top (centered)",
};

const inputClass = "h-9 w-full rounded-md border border-line bg-paper px-3 text-sm";

export function BuilderPanel({
  resume,
  config: initialConfig,
  layout,
}: {
  resume: JsonResume;
  config: CvTemplateConfig;
  layout: CvLayout;
}) {
  const [state, saveAction, pending] = useActionState(saveCvTemplateAction, initialState);
  const [config, setConfig] = useState<CvTemplateConfig>(initialConfig);

  // Server config changed (a version was loaded) → sync during render,
  // dropping unsaved local edits only when the server truth actually differs.
  const initialJson = JSON.stringify(initialConfig);
  const [prevInitialJson, setPrevInitialJson] = useState(initialJson);
  if (prevInitialJson !== initialJson) {
    setPrevInitialJson(initialJson);
    setConfig(initialConfig);
  }

  const showPhoto = config.fields.photo;

  const toggleField = (field: CvTemplateField): void => {
    setConfig((prev) => ({ ...prev, fields: { ...prev.fields, [field]: !prev.fields[field] } }));
  };

  const setPhotoUrl = (value: string): void => {
    setConfig((prev) => ({ ...prev, imageUrl: value }));
  };

  const setHeadline = (value: string): void => {
    setConfig((prev) => ({ ...prev, headline: value }));
  };

  const setPhotoShape = (photoShape: CvTemplatePhotoShape): void => {
    setConfig((prev) => ({ ...prev, photoShape }));
  };

  const setPhotoPosition = (photoPosition: CvTemplatePhotoPosition): void => {
    setConfig((prev) => ({ ...prev, photoPosition }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form
        action={saveAction}
        className="flex h-fit flex-col gap-4 rounded-lg border border-line bg-surface p-4 print:hidden"
      >
        <input type="hidden" name="config" value={JSON.stringify(config)} />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Template</span>
          <select
            aria-label="Template"
            value={config.template}
            disabled
            className={`${inputClass} opacity-60`}
          >
            <option value="classic">classic</option>
          </select>
          <p className="text-[11px] text-muted">The only template for now — more later.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cv-headline" className="text-xs text-muted">
            Headline
          </label>
          <input
            id="cv-headline"
            type="text"
            value={config.headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="Auto: most recent position"
            maxLength={120}
            className={inputClass}
          />
          <p className="text-[11px] text-muted">
            Shown under your name — empty means the most recent position.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cv-photo-url" className="text-xs text-muted">
            Photo URL
          </label>
          <input
            id="cv-photo-url"
            type="url"
            value={config.imageUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            placeholder="https://…/photo.jpg"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Photo shape</span>
          <div className="flex flex-wrap gap-3">
            {CV_TEMPLATE_PHOTO_SHAPES.map((shape) => (
              <label
                key={shape}
                htmlFor={`cv-shape-${shape}`}
                className={`flex items-center gap-1.5 text-sm ${showPhoto ? "" : "opacity-50"}`}
              >
                <input
                  id={`cv-shape-${shape}`}
                  type="radio"
                  name="photo-shape"
                  className="size-4 accent-accent"
                  checked={config.photoShape === shape}
                  disabled={!showPhoto}
                  onChange={() => setPhotoShape(shape)}
                />
                {PHOTO_SHAPE_LABELS[shape]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Photo position</span>
          <div className="flex flex-wrap gap-3">
            {CV_TEMPLATE_PHOTO_POSITIONS.map((position) => (
              <label
                key={position}
                htmlFor={`cv-position-${position}`}
                className={`flex items-center gap-1.5 text-sm ${showPhoto ? "" : "opacity-50"}`}
              >
                <input
                  id={`cv-position-${position}`}
                  type="radio"
                  name="photo-position"
                  className="size-4 accent-accent"
                  checked={config.photoPosition === position}
                  disabled={!showPhoto}
                  onChange={() => setPhotoPosition(position)}
                />
                {PHOTO_POSITION_LABELS[position]}
              </label>
            ))}
          </div>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs text-muted">Show</legend>
          {CV_TEMPLATE_FIELD_KEYS.map((field) => (
            <label
              key={field}
              htmlFor={`cv-field-${field}`}
              className="flex items-center gap-2 text-sm"
            >
              <input
                id={`cv-field-${field}`}
                type="checkbox"
                checked={config.fields[field]}
                onChange={() => toggleField(field)}
                className="size-4 accent-accent"
              />
              {FIELD_LABELS[field]}
            </label>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save template"}
          </button>
          <PrintButton />
          {state.message ? <output className="text-xs text-muted">{state.message}</output> : null}
        </div>
      </form>

      <div className="min-w-0 rounded-lg border border-line bg-surface p-6 print:border-0 print:p-0">
        <p className="mb-4 text-xs text-muted print:hidden">
          Live preview — exactly what /cv shows and what the printed PDF contains.
        </p>
        <ClassicTemplate resume={resume} config={config} layout={layout} />
      </div>
    </div>
  );
}
