import { CampusEntity } from '../types';

// Known building and campus facility entity keys in Mangalore University
export const KNOWN_BUILDING_KEYS = new Set([
  'science block',
  'humanities block',
  'mba block',
  'biosciences complex',
  'purse complex',
  'administration block',
  'library',
  'auditorium',
  'medical center',
  'indoor games',
  'yakshagana',
  'applied botany department',
  'geography department',
  'yogic sciences department',
  'boys hostel',
  'ladies hostel',
  'canteen',
  'sbi bank',
  'sbi atm',
  '400 meter track',
  '200 meter track',
  'main gate',
  'security',
  'ibm center',
  'zoology museum',
]);

/**
 * Checks if a campus entity represents a campus building or physical facility
 */
export function isBuildingEntity(entity: CampusEntity): boolean {
  if (entity.is_building === true) return true;
  if (KNOWN_BUILDING_KEYS.has(entity.key.toLowerCase().trim())) return true;
  if (Array.isArray(entity.departments_here) && entity.departments_here.length > 0) return true;

  const keyLower = (entity.key || '').toLowerCase();
  const nameLower = (entity.name || '').toLowerCase();

  const buildingKeywords = ['block', 'complex', 'bhavan', 'building', 'auditorium', 'library', 'hostel', 'stadium', 'kendra'];
  const hasKeyword = buildingKeywords.some(kw => keyLower.includes(kw) || nameLower.includes(kw));

  // If it has lat/lng coordinates and a building keyword, consider it a building
  if (hasKeyword && entity.lat != null && entity.lng != null) {
    return true;
  }

  return false;
}

/**
 * Returns all campus buildings sorted by importance and name
 */
export function getAllCampusBuildings(allEntities: Record<string, CampusEntity>): CampusEntity[] {
  const buildings: CampusEntity[] = [];
  const seenKeys = new Set<string>();

  // 1. Direct building entities in campus data
  for (const entity of Object.values(allEntities)) {
    if (isBuildingEntity(entity) && !seenKeys.has(entity.key)) {
      seenKeys.add(entity.key);
      buildings.push(entity);
    }
  }

  // 2. Discover any custom location names referenced by departments that might not have a dedicated entity yet
  for (const dept of Object.values(allEntities)) {
    const loc = (dept.location || '').trim();
    if (!loc) continue;

    const locLower = loc.toLowerCase();
    const existing = buildings.some(
      b => b.key.toLowerCase() === locLower || b.name.toLowerCase() === locLower || (b.aliases || []).some(a => a.toLowerCase() === locLower)
    );

    if (!existing && (loc.includes('Block') || loc.includes('Complex') || loc.includes('Building') || loc.includes('Bhavan'))) {
      const generatedKey = locLower.replace(/[^a-z0-9]+/g, '-');
      if (!seenKeys.has(generatedKey)) {
        seenKeys.add(generatedKey);
        buildings.push({
          key: generatedKey,
          name: loc,
          location: loc,
          is_building: true,
          verified: true,
          departments_here: [dept.name],
        });
      }
    }
  }

  // Sort: prominent blocks first, then alphabetical
  const priorityKeys = [
    'science block',
    'humanities block',
    'mba block',
    'biosciences complex',
    'purse complex',
    'administration block',
    'library',
    'auditorium',
    'medical center',
    'boys hostel',
    'ladies hostel',
    'indoor games',
  ];

  return buildings.sort((a, b) => {
    const idxA = priorityKeys.indexOf(a.key.toLowerCase());
    const idxB = priorityKeys.indexOf(b.key.toLowerCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Calculates all departments and offices housed in a specific building
 */
export function getBuildingDepartments(
  building: CampusEntity,
  allEntities: Record<string, CampusEntity>
): string[] {
  const deptSet = new Set<string>();

  // Add explicit departments_here
  if (Array.isArray(building.departments_here)) {
    building.departments_here.forEach(d => deptSet.add(d));
  }

  // Find all departments referencing this building's name or key in their location field
  const bNameLower = building.name.toLowerCase();
  const bKeyLower = building.key.toLowerCase();

  for (const entity of Object.values(allEntities)) {
    // Skip comparing building with itself
    if (entity.key === building.key) continue;

    const loc = (entity.location || '').toLowerCase();
    if (
      loc.includes(bNameLower) ||
      loc.includes(bKeyLower) ||
      (bKeyLower.includes('science') && loc.includes('science block')) ||
      (bKeyLower.includes('humanities') && loc.includes('humanities')) ||
      (bKeyLower.includes('mba') && loc.includes('mba')) ||
      (bKeyLower.includes('purse') && loc.includes('purse')) ||
      (bKeyLower.includes('bioscience') && loc.includes('bioscience')) ||
      (bKeyLower.includes('administration') && (loc.includes('administration') || loc.includes('pareeksha')))
    ) {
      deptSet.add(entity.name);
    }
  }

  return Array.from(deptSet);
}

/**
 * Returns distinct building names for quick dropdowns and tag selectors
 */
export function getAllDistinctBuildingNames(allEntities: Record<string, CampusEntity>): string[] {
  const buildings = getAllCampusBuildings(allEntities);
  const names = new Set<string>();

  buildings.forEach(b => {
    if (b.name) names.add(b.name);
  });

  // Common campus blocks in Mangalore University
  const commonNames = [
    'Science Block',
    'Humanities Block (Faculty of Arts)',
    'MBA Block',
    'Bioscience Complex',
    'DST-PURSE Centre & Central Research Facility',
    'Administration Block (Mangala Administrative Building)',
    'Pareeksha Bhavan (Examination Section)',
    'Central University Library',
    'Mangala Auditorium',
    'University Health Centre',
    'Applied Botany Block',
    'Geography Block',
    'Yogic Science Block',
    'University Hostel for Men',
    'University Hostel for Women (Gangotri & Kaveri)',
    'Indoor Stadium & Sports Complex',
    'Yakshagana Kala Kendra',
    'University Canteen',
    'Bank & ATM Complex',
  ];

  commonNames.forEach(n => names.add(n));

  return Array.from(names).sort();
}
