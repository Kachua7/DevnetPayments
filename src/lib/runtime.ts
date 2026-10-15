/** Fail-closed guard for integrations that are not implemented. */
export function blockIfIntegrationMissing(integrationName: string): void {
  window.alert(
    `${integrationName} is unavailable in this release. No real-world action was performed and no result should be treated as authoritative.`
  );
}
