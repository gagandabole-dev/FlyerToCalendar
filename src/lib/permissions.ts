export const ADMIN_EMAIL = "gagan.dabole@gmail.com";

export function canExportProject(userEmail?: string, projectStatus?: string): boolean {
  if (userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  return projectStatus === 'paid';
}
