import { describe, expect, it } from "vitest";
import { findUnsupportedClaims } from "@/application/documents/unsupported-claims";
import { makeJob } from "../../support/make-job";
import { makeProfile } from "../../support/make-profile";

describe("findUnsupportedClaims", () => {
  const profile = makeProfile();
  const job = makeJob({
    title: "React Developer",
    description: "TypeScript and React dashboards with GraphQL APIs.",
  });

  it("flags technical tokens present in neither the profile nor the job", () => {
    const content = "I am fluent in Kubernetes and Terraform, with COBOL experience.";

    const warnings = findUnsupportedClaims(content, profile, job);

    expect(warnings).toContain("Kubernetes");
    expect(warnings).toContain("Terraform");
    expect(warnings).toContain("COBOL");
  });

  it("does not flag skills present in the profile", () => {
    const content = "My TypeScript and Node.js background with GraphQL from the offer.";

    const warnings = findUnsupportedClaims(content, profile, job);

    expect(warnings).toEqual([]);
  });

  it("flags Capitalized tech-looking words absent from profile and job", () => {
    const content = "I rebuilt the pipeline with Kubernetes and Terraform.";

    const warnings = findUnsupportedClaims(content, profile, job);

    expect(warnings).toContain("Kubernetes");
    expect(warnings).toContain("Terraform");
  });

  it("does not flag lowercase prose without technical tokens", () => {
    const content =
      "I build accessible interfaces and enjoy working closely with product teams on delivery.";

    const warnings = findUnsupportedClaims(content, profile, job);

    expect(warnings).toEqual([]);
  });

  it("does not flag profile company, name or location", () => {
    const content = "At Nimbus SaaS, Alex Morgan moved from Madrid to ship TypeScript dashboards.";

    const warnings = findUnsupportedClaims(content, profile, job);

    expect(warnings).toEqual([]);
  });

  it("skips sentence-initial prose capitals", () => {
    const content =
      "Beyond my daily work, I value clarity. During reviews I flag risks. Additionally I document decisions.";

    const warnings = findUnsupportedClaims(content, profile, job);

    expect(warnings).toEqual([]);
  });

  it("flags a mid-sentence tech word even when other prose is capitalized", () => {
    const content = "Beyond frontend work I also operate Kubernetes clusters daily.";

    const warnings = findUnsupportedClaims(content, profile, job);

    expect(warnings).toEqual(["Kubernetes"]);
  });

  it("does not flag hyphenated ordinary words", () => {
    const content = "I enjoy co-founding side projects with teammates on quiet weeks.";

    const warnings = findUnsupportedClaims(content, profile, job);

    expect(warnings).toEqual([]);
  });

  it("caps the warning list", () => {
    const tokens = [
      "Kafka",
      "Spark",
      "Hadoop",
      "Cassandra",
      "Couchbase",
      "Riak",
      "Memcached",
      "Zookeeper",
      "Solr",
      "Storm",
      "Flink",
      "Samza",
    ];
    const content = tokens.join(" plus ");

    const warnings = findUnsupportedClaims(content, profile, job);

    expect(warnings.length).toBeLessThanOrEqual(8);
  });
});
