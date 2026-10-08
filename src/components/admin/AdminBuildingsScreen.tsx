import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Edit3, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Search, 
  X, 
  Check, 
  Layers, 
  Compass
} from 'lucide-react';
import { storage } from '../../services/storage';
import { CampusEntity } from '../../types';
import { 
  getAllCampusBuildings, 
  getBuildingDepartments, 
  getAllDistinctBuildingNames 
} from '../../utils/buildingUtils';

interface AdminBuildingsScreenProps {
  onBack: () => void;
  initialAddOpen?: boolean;
}

export const AdminBuildingsScreen: React.FC<AdminBuildingsScreenProps> = ({ 
  onBack,
  initialAddOpen = false 
}) => {
  const [departments, setDepartments] = useState<Record<string, CampusEntity>>(() => storage.getDepartments());
  const [activeTab, setActiveTab] = useState<'buildings' | 'departments'>('buildings');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Department location edit state
  const [editingDeptKey, setEditingDeptKey] = useState<string | null>(null);
  const [locationText, setLocationText] = useState('');

  // Building add/edit modal state
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(initialAddOpen);
  const [editingBuildingKey, setEditingBuildingKey] = useState<string | null>(null);
  
  // Building Form Fields
  const [bName, setBName] = useState('');
  const [bNameKn, setBNameKn] = useState('');
  const [bLocation, setBLocation] = useState('');
  const [bLat, setBLat] = useState('12.81661');
  const [bLng, setBLng] = useState('74.92405');
  const [bDirections, setBDirections] = useState('');
  const [bDepartments, setBDepartments] = useState('');
  
  const [toast, setToast] = useState<string | null>(null);

  const refreshData = () => {
    setDepartments(storage.getDepartments());
  };

  useEffect(() => {
    refreshData();
    storage.syncDepartmentsFromBackend().then(latest => setDepartments(latest));
    window.addEventListener('cbmu_data_updated', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      window.removeEventListener('cbmu_data_updated', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Derive buildings list
  const buildingsList = useMemo(() => {
    return getAllCampusBuildings(departments);
  }, [departments]);

  // Distinct building names for suggestions
  const distinctBuildingNames = useMemo(() => {
    return getAllDistinctBuildingNames(departments);
  }, [departments]);

  // Filtered buildings
  const filteredBuildings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return buildingsList;
    return buildingsList.filter(b => 
      b.name.toLowerCase().includes(q) ||
      (b.name_kn && b.name_kn.toLowerCase().includes(q)) ||
      (b.location && b.location.toLowerCase().includes(q)) ||
      (b.departments_here && b.departments_here.some(d => d.toLowerCase().includes(q)))
    );
  }, [buildingsList, searchQuery]);

  // Filtered departments for assignments tab
  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const entries = Object.entries(departments);
    if (!q) return entries;
    return entries.filter(([key, d]) => 
      d.name.toLowerCase().includes(q) ||
      (d.location && d.location.toLowerCase().includes(q)) ||
      key.toLowerCase().includes(q)
    );
  }, [departments, searchQuery]);

  // Open Add Building modal
  const handleOpenAddBuilding = () => {
    setEditingBuildingKey(null);
    setBName('');
    setBNameKn('');
    setBLocation('Mangalore University Campus');
    setBLat('12.81661');
    setBLng('74.92405');
    setBDirections('');
    setBDepartments('');
    setIsBuildingModalOpen(true);
  };

  // Open Edit Building modal
  const handleOpenEditBuilding = (building: CampusEntity) => {
    setEditingBuildingKey(building.key);
    setBName(building.name);
    setBNameKn(building.name_kn || '');
    setBLocation(building.location || '');
    setBLat(building.lat != null ? String(building.lat) : '12.81661');
    setBLng(building.lng != null ? String(building.lng) : '74.92405');
    setBDirections(building.directions || '');
    const depts = getBuildingDepartments(building, departments);
    setBDepartments(depts.join(', '));
    setIsBuildingModalOpen(true);
  };

  // Save building
  const handleSaveBuilding = () => {
    if (!bName.trim()) {
      alert('Building Name is required');
      return;
    }

    const key = editingBuildingKey || bName.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
    const parsedLat = parseFloat(bLat.trim());
    const parsedLng = parseFloat(bLng.trim());

    const deptArray = bDepartments
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const updated = { ...departments };
    const existing = updated[key] || {};

    updated[key] = {
      ...existing,
      key,
      name: bName.trim(),
      name_kn: bNameKn.trim() || undefined,
      location: bLocation.trim() || undefined,
      lat: !isNaN(parsedLat) ? parsedLat : 12.81661,
      lng: !isNaN(parsedLng) ? parsedLng : 74.92405,
      directions: bDirections.trim() || undefined,
      departments_here: deptArray.length > 0 ? deptArray : undefined,
      is_building: true,
      last_verified: editingBuildingKey ? 'admin-edited' : 'admin-added',
      verified: true,
    };

    storage.saveDepartments(updated);
    setDepartments(updated);
    setIsBuildingModalOpen(false);
    showToast(editingBuildingKey ? `Building "${bName}" updated` : `New building "${bName}" added successfully!`);
  };

  // Delete building
  const handleDeleteBuilding = (key: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from buildings list?`)) return;

    const updated = { ...departments };
    delete updated[key];
    storage.saveDepartments(updated);
    setDepartments(updated);
    if (editingBuildingKey === key) {
      setIsBuildingModalOpen(false);
    }
    showToast(`Removed building "${name}"`);
  };

  // Edit department location
  const handleStartEditDeptLocation = (deptKey: string, currentLocation: string) => {
    setEditingDeptKey(deptKey);
    setLocationText(currentLocation || '');
  };

  const handleSaveDeptLocation = () => {
    if (!editingDeptKey) return;
    storage.assignDepartmentLocation(editingDeptKey, locationText.trim());
    showToast(`Updated location for "${departments[editingDeptKey]?.name || 'Department'}"`);
    setEditingDeptKey(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="h-14 px-4 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-[#2A2A2A] text-white transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base leading-none">Campus Buildings & Locations</h2>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{buildingsList.length} Buildings</span>
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">Manage building names, GPS coordinates & department allocations</p>
          </div>
        </div>

        <button
          onClick={handleOpenAddBuilding}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-[#10A37F]/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Building</span>
        </button>
      </div>

      {toast && (
        <div className="bg-[#10A37F] text-white text-xs font-semibold px-4 py-2 text-center animate-in slide-in-from-top shrink-0">
          {toast}
        </div>
      )}

      {/* Tabs & Search Header */}
      <div className="p-4 border-b border-[#2A2A2A] bg-[#161616]/80 backdrop-blur-xs space-y-3 shrink-0 max-w-2xl mx-auto w-full">
        {/* Tab Toggle */}
        <div className="flex bg-[#202020] p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('buildings')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'buildings'
                ? 'bg-[#10A37F] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Campus Buildings ({buildingsList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'departments'
                ? 'bg-[#10A37F] text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Department Assignments ({Object.keys(departments).length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'buildings'
                ? 'Search building names, complexes, or blocks...'
                : 'Search departments to assign building location...'
            }
            className="w-full pl-9 pr-9 py-2 bg-[#202020] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#10A37F] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-2xl mx-auto w-full">
        {activeTab === 'buildings' ? (
          <>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-neutral-400">
                Showing {filteredBuildings.length} of {buildingsList.length} university buildings
              </span>
              <button
                onClick={handleOpenAddBuilding}
                className="text-xs text-[#10A37F] hover:underline font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>New Building</span>
              </button>
            </div>

            {filteredBuildings.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center space-y-3">
                <Building2 className="w-10 h-10 text-neutral-600 mx-auto" />
                <p className="text-sm font-medium text-neutral-300">No buildings found matching &quot;{searchQuery}&quot;</p>
                <button
                  onClick={handleOpenAddBuilding}
                  className="px-4 py-2 bg-[#10A37F] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add as New Building</span>
                </button>
              </div>
            ) : (
              filteredBuildings.map((building) => {
                const housedDepts = getBuildingDepartments(building, departments);
                const hasGps = building.lat != null && building.lng != null;

                return (
                  <div
                    key={building.key}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-neutral-700 rounded-2xl p-4 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#10A37F]/15 border border-[#10A37F]/30 flex items-center justify-center text-[#10A37F] shrink-0 mt-0.5">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-white leading-tight">
                            {building.name}
                          </h4>
                          {building.name_kn && (
                            <p className="text-xs text-emerald-400/90 font-medium mt-0.5">
                              {building.name_kn}
                            </p>
                          )}
                          {building.location && (
                            <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
                              📍 {building.location}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEditBuilding(building)}
                          className="p-2 rounded-lg bg-[#252525] hover:bg-[#303030] text-neutral-300 hover:text-white transition-colors"
                          title="Edit building details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {hasGps && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${building.lat},${building.lng}&travelmode=walking`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-[#252525] hover:bg-[#303030] text-neutral-300 hover:text-emerald-400 transition-colors"
                            title="Open in Google Maps"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteBuilding(building.key, building.name)}
                          className="p-2 rounded-lg bg-[#252525] hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                          title="Delete building"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Coordinates & Meta */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#252525] text-[11px] text-neutral-400">
                      {hasGps ? (
                        <span className="inline-flex items-center gap-1 bg-[#222222] border border-neutral-800 px-2 py-0.5 rounded-md font-mono text-neutral-300">
                          <Compass className="w-3 h-3 text-emerald-400" />
                          <span>{building.lat?.toFixed(5)}, {building.lng?.toFixed(5)}</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[10px]">No GPS set</span>
                      )}

                      <span className="inline-flex items-center gap-1 bg-[#222222] border border-neutral-800 px-2 py-0.5 rounded-md text-neutral-300">
                        <Layers className="w-3 h-3 text-blue-400" />
                        <span>{housedDepts.length} department(s) located here</span>
                      </span>
                    </div>

                    {/* Hosted Departments Chips */}
                    {housedDepts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {housedDepts.map((dName, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 px-2 py-0.5 rounded-md"
                          >
                            {dName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-neutral-400">
                Click any department below to assign its building & floor
              </span>
            </div>

            <div className="space-y-2">
              {filteredDepartments.map(([key, d]) => {
                const loc = (d.location || '').trim();
                const hasLocation = loc.length > 0;

                return (
                  <div
                    key={key}
                    onClick={() => handleStartEditDeptLocation(key, loc)}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-neutral-700 rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        hasLocation ? 'bg-[#10A37F]/15 text-[#10A37F]' : 'bg-red-500/15 text-red-400'
                      }`}>
                        <MapPin className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-white truncate group-hover:text-emerald-300 transition-colors">
                          {d.name}
                        </h4>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {hasLocation ? (
                            <span className="text-emerald-400 font-medium">{loc}</span>
                          ) : (
                            <span className="text-neutral-500 italic">No building assigned yet</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <Edit3 className="w-4 h-4 text-neutral-500 group-hover:text-white shrink-0 transition-colors" />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ADD / EDIT BUILDING MODAL */}
      {isBuildingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#10A37F]/15 text-[#10A37F] flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingBuildingKey ? 'Edit Campus Building' : 'Add New Campus Building'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">Save official building names and coordinates</p>
                </div>
              </div>
              <button
                onClick={() => setIsBuildingModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Building Name (English) *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  placeholder="e.g. Science Block or Central Library"
                  className="w-full px-3.5 py-2.5 bg-[#222222] border border-[#333333] rounded-xl text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Building Name (Kannada - ಕನ್ನಡ)
                </label>
                <input
                  type="text"
                  value={bNameKn}
                  onChange={(e) => setBNameKn(e.target.value)}
                  placeholder="e.g. ವಿಜ್ಞಾನ ಬ್ಲಾಕ್ ಅಥವಾ ಕೇಂದ್ರ ಗ್ರಂಥಾಲಯ"
                  className="w-full px-3.5 py-2.5 bg-[#222222] border border-[#333333] rounded-xl text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Zone / Campus Location
                </label>
                <input
                  type="text"
                  value={bLocation}
                  onChange={(e) => setBLocation(e.target.value)}
                  placeholder="e.g. Faculty of Science & Technology Complex, Konaje"
                  className="w-full px-3.5 py-2.5 bg-[#222222] border border-[#333333] rounded-xl text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    GPS Latitude
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={bLat}
                    onChange={(e) => setBLat(e.target.value)}
                    placeholder="12.81685"
                    className="w-full px-3.5 py-2 bg-[#222222] border border-[#333333] rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-[#10A37F]"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    GPS Longitude
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={bLng}
                    onChange={(e) => setBLng(e.target.value)}
                    placeholder="74.92306"
                    className="w-full px-3.5 py-2 bg-[#222222] border border-[#333333] rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-[#10A37F]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Directions & Campus Guidance
                </label>
                <textarea
                  rows={2}
                  value={bDirections}
                  onChange={(e) => setBDirections(e.target.value)}
                  placeholder="e.g. Near Library lawn, opposite Administration Block."
                  className="w-full px-3.5 py-2 bg-[#222222] border border-[#333333] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Departments / Offices Located Here (comma-separated)
                </label>
                <input
                  type="text"
                  value={bDepartments}
                  onChange={(e) => setBDepartments(e.target.value)}
                  placeholder="Computer Science, Physics, Chemistry, Materials Science..."
                  className="w-full px-3.5 py-2 bg-[#222222] border border-[#333333] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
              {editingBuildingKey ? (
                <button
                  type="button"
                  onClick={() => handleDeleteBuilding(editingBuildingKey, bName)}
                  className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBuildingModalOpen(false)}
                  className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-neutral-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBuilding}
                  className="px-5 py-2 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#10A37F]/20 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingBuildingKey ? 'Save Changes' : 'Add Building'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN DEPARTMENT LOCATION MODAL */}
      {editingDeptKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">
                  {departments[editingDeptKey]?.name}
                </h3>
                <p className="text-[11px] text-neutral-400">Assign official building and floor location</p>
              </div>
              <button onClick={() => setEditingDeptKey(null)} className="p-1 rounded-lg hover:bg-[#2A2A2A] text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-neutral-300 font-semibold block mb-1">
                Select from Campus Buildings:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-[#161616] border border-neutral-800 rounded-xl mb-3">
                {distinctBuildingNames.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLocationText(name)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      locationText.toLowerCase().includes(name.toLowerCase())
                        ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 font-medium'
                        : 'bg-[#222222] border-neutral-700 text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <label className="text-xs text-neutral-300 font-semibold block mb-1">
                Location / Floor & Room Description:
              </label>
              <input
                type="text"
                autoFocus
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="e.g. Science Block, 2nd Floor, Room 204"
                className="w-full px-3.5 py-2.5 bg-[#222222] border border-[#333333] rounded-xl text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2A2A2A]">
              <button
                type="button"
                onClick={() => setEditingDeptKey(null)}
                className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-neutral-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeptLocation}
                className="px-5 py-2 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#10A37F]/20"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
