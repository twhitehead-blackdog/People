import { Employee } from '../../../models';

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();

export function matchesEmployeeSearch(emp: Partial<Employee>, searchTerm: string): boolean {
  if (!searchTerm) return false;

  const trimmedSearch = searchTerm.toLowerCase().trim();
  if (!trimmedSearch) return false;

  const firstName = normalize(emp.first_name);
  const fatherName = normalize(emp.father_name);
  const middleName = normalize(emp.middle_name);
  const motherName = normalize(emp.mother_name);

  const spaceIndex = trimmedSearch.indexOf(' ');
  if (spaceIndex === -1) {
    const word = trimmedSearch;
    return (
      firstName.startsWith(word) ||
      fatherName.startsWith(word) ||
      middleName.startsWith(word) ||
      motherName.startsWith(word)
    );
  }

  const searchWords = trimmedSearch.split(/\s+/).filter((w) => w.length > 0);
  if (searchWords.length === 0) return false;

  for (const word of searchWords) {
    if (
      !firstName.startsWith(word) &&
      !fatherName.startsWith(word) &&
      !middleName.startsWith(word) &&
      !motherName.startsWith(word)
    ) {
      return false;
    }
  }

  return true;
}
