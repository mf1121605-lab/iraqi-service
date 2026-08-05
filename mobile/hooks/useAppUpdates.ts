// Deliberately disabled. This used to silently check for an EAS OTA
// update on every launch and swap the running JS bundle for whatever
// was last published to the "preview" channel — including, at one
// point, a mismatched/incompatible publish from an unrelated EAS
// project accidentally created outside this workflow. That made a
// freshly built, verified-correct APK behave like a stale or broken
// install with no visible explanation. Every release now goes out as
// a full `eas build`, so there is nothing an OTA check would add here
// except risk. Kept as a no-op hook (rather than deleted) so the single
// call site in app/_layout.tsx doesn't need to change.
export function useAppUpdates() {}
