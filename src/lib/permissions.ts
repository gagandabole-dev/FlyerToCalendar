export const ADMIN_EMAIL = "gagan.dabole@gmail.com";

export function isSuperAdmin(email?: string): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function canExportProject(userEmail?: string, projectStatus?: string): boolean {
  if (isSuperAdmin(userEmail)) return true;
  return projectStatus === 'paid' || projectStatus === 'bypass';
}

export function canGenerateFeed(userEmail?: string, projectStatus?: string): boolean {
  if (isSuperAdmin(userEmail)) return true;
  return projectStatus === 'paid' || projectStatus === 'bypass';
}
