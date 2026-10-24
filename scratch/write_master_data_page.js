const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('..', 'car_blink_dashboard', 'app', '(admin)', 'admin', 'master-data', 'page.tsx');

const code = `// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { 
  useMasterDataServices, 
  useMasterDataStates,
  useCreateStateMutation,
  useUpdateStateMutation,
  useDeleteStateMutation,
  useMasterDataCities, 
  useCreateCityMutation, 
  useUpdateCityMutation,
  useDeleteCityMutation 
} from "@/features/admin/hooks/useAdminQueries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  MapPin, 
  Wrench, 
  Trash2, 
  Plus, 
  AlertCircle, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Globe2, 
  Building2, 
  Search, 
  CheckCircle2, 
  X, 
  Filter,
  ArrowRight,
  ShieldCheck,
  Check,
  Tag
} from "lucide-react";

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<"states" | "cities" | "services">("states");
  
  // Pagination
  const [servicePage, setServicePage] = useState(1);
  const [statePage, setStatePage] = useState(1);
  const [cityPage, setCityPage] = useState(1);
  const limit = 10;
  
  // Search & Filter
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("ALL");

  // React Query Hooks
  const { data: servicesData, isLoading: isServicesLoading } = useMasterDataServices();
  const { data: statesData, isLoading: isStatesLoading } = useMasterDataStates();
  const { data: citiesData, isLoading: isCitiesLoading } = useMasterDataCities();
  
  // Mutations
  const createServiceMutation = useCreateServiceMutation();
  const updateServiceMutation = useUpdateServiceMutation();
  const deleteServiceMutation = useDeleteServiceMutation();
  
  const createStateMutation = useCreateStateMutation();
  const updateStateMutation = useUpdateStateMutation();
  const deleteStateMutation = useDeleteStateMutation();

  const createCityMutation = useCreateCityMutation();
  const updateCityMutation = useUpdateCityMutation();
  const deleteCityMutation = useDeleteCityMutation();
  
  const services = servicesData || [];
  const states = statesData || [];
  const cities = citiesData || [];

  // Filtered Lists
  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return states;
    const q = stateSearch.toLowerCase().trim();
    return states.filter((s: any) => 
      s.name?.toLowerCase().includes(q) || 
      s.code?.toLowerCase().includes(q)
    );
  }, [states, stateSearch]);

  const filteredCities = useMemo(() => {
    return cities.filter((c: any) => {
      const matchesSearch = !citySearch.trim() || 
        c.name?.toLowerCase().includes(citySearch.toLowerCase().trim());
      
      const matchesState = selectedStateFilter === "ALL" || 
        c.stateId === selectedStateFilter || 
        c.stateId?._id === selectedStateFilter ||
        c.state?.toLowerCase() === selectedStateFilter.toLowerCase();

      return matchesSearch && matchesState;
    });
  }, [cities, citySearch, selectedStateFilter]);

  // Paginated Slices
  const paginatedServices = services.slice((servicePage - 1) * limit, servicePage * limit);
  const totalServicePages = Math.ceil(services.length / limit) || 1;

  const paginatedStates = filteredStates.slice((statePage - 1) * limit, statePage * limit);
  const totalStatePages = Math.ceil(filteredStates.length / limit) || 1;

  const paginatedCities = filteredCities.slice((cityPage - 1) * limit, cityPage * limit);
  const totalCityPages = Math.ceil(filteredCities.length / limit) || 1;

  // Active form states
  const [message, setMessage] = useState({ type: "", text: "" });

  // State Form
  const [newState, setNewState] = useState({ name: "", code: "", country: "India", isActive: true });
  const [editingStateId, setEditingStateId] = useState<string | null>(null);

  // City Form (Linked to State)
  const [newCity, setNewCity] = useState({ name: "", stateId: "", state: "", isActive: true });
  const [editingCityId, setEditingCityId] = useState<string | null>(null);

  // Service Form
  const [newService, setNewService] = useState({ name: "", description: "" });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Modals / Dialogs
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "state" | "city" | "service";
    id: string;
    title: string;
    citiesCount?: number;
    deleteLinkedCities?: boolean;
  }>({ open: false, type: "state", id: "", title: "", citiesCount: 0, deleteLinkedCities: false });

  // Notifications helper
  const showFeedback = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  // ==========================================
  // STATE HANDLERS
  // ==========================================
  const handleSaveState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newState.name.trim()) {
      showFeedback("error", "Please provide a valid state name.");
      return;
    }

    try {
      if (editingStateId) {
        await updateStateMutation.mutateAsync({
          id: editingStateId,
          data: {
            name: newState.name.trim(),
            code: newState.code.trim().toUpperCase() || undefined,
            country: newState.country.trim() || "India",
            isActive: newState.isActive,
          }
        });
        showFeedback("success", \`State "\${newState.name}" updated successfully.\`);
      } else {
        await createStateMutation.mutateAsync({
          name: newState.name.trim(),
          code: newState.code.trim().toUpperCase() || undefined,
          country: newState.country.trim() || "India",
          isActive: newState.isActive,
        });
        showFeedback("success", \`State "\${newState.name}" created successfully.\`);
      }
      setNewState({ name: "", code: "", country: "India", isActive: true });
      setEditingStateId(null);
    } catch (err: any) {
      showFeedback("error", err?.response?.data?.message || err?.message || "Failed to save state.");
    }
  };

  const handleEditState = (stateItem: any) => {
    setEditingStateId(stateItem._id);
    setNewState({
      name: stateItem.name || "",
      code: stateItem.code || "",
      country: stateItem.country || "India",
      isActive: stateItem.isActive !== false,
    });
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  // ==========================================
  // CITY HANDLERS (Linked to State)
  // ==========================================
  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.name.trim()) {
      showFeedback("error", "Please provide a valid city name.");
      return;
    }
    if (!newCity.stateId && !newCity.state) {
      showFeedback("error", "Please select a State to link this city to.");
      return;
    }

    try {
      const selectedStateObj = states.find((s: any) => s._id === newCity.stateId || s.name === newCity.state);
      const stateId = selectedStateObj?._id || newCity.stateId;
      const stateName = selectedStateObj?.name || newCity.state;

      const payload = {
        name: newCity.name.trim(),
        stateId,
        state: stateName,
        isActive: newCity.isActive,
      };

      if (editingCityId) {
        await updateCityMutation.mutateAsync({ id: editingCityId, data: payload });
        showFeedback("success", \`City "\${newCity.name}" updated successfully in \${stateName}.\`);
      } else {
        await createCityMutation.mutateAsync(payload);
        showFeedback("success", \`City "\${newCity.name}" linked and created in \${stateName}.\`);
      }
      setNewCity({ name: "", stateId: "", state: "", isActive: true });
      setEditingCityId(null);
    } catch (err: any) {
      showFeedback("error", err?.response?.data?.message || err?.message || "Failed to save city.");
    }
  };

  const handleEditCity = (cityItem: any) => {
    setEditingCityId(cityItem._id);
    setNewCity({
      name: cityItem.name || "",
      stateId: cityItem.stateId?._id || cityItem.stateId || "",
      state: cityItem.state || "",
      isActive: cityItem.isActive !== false,
    });
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  // ==========================================
  // SERVICE HANDLERS
  // ==========================================
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name.trim()) return;
    try {
      const slug = newService.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const payload = { ...newService, slug, icon: "wrench" };
      
      if (editingServiceId) {
        await updateServiceMutation.mutateAsync({ id: editingServiceId, data: payload });
        showFeedback("success", "Service updated successfully.");
      } else {
        await createServiceMutation.mutateAsync(payload);
        showFeedback("success", "Service added successfully.");
      }
      
      setNewService({ name: "", description: "" });
      setEditingServiceId(null);
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to save service.");
    }
  };

  // ==========================================
  // DELETE HANDLERS
  // ==========================================
  const triggerDelete = (type: "state" | "city" | "service", item: any) => {
    setDeleteDialog({
      open: true,
      type,
      id: item._id,
      title: item.name,
      citiesCount: item.citiesCount || 0,
      deleteLinkedCities: false,
    });
  };

  const confirmDelete = async () => {
    const { type, id, deleteLinkedCities, title } = deleteDialog;
    try {
      if (type === "state") {
        await deleteStateMutation.mutateAsync({ id, deleteLinkedCities });
        showFeedback("success", \`State "\${title}" deleted successfully.\`);
      } else if (type === "city") {
        await deleteCityMutation.mutateAsync(id);
        showFeedback("success", \`City "\${title}" deleted successfully.\`);
      } else if (type === "service") {
        await deleteServiceMutation.mutateAsync(id);
        showFeedback("success", \`Service "\${title}" deleted successfully.\`);
      }
    } catch (err: any) {
      showFeedback("error", err?.response?.data?.message || err?.message || \`Failed to delete \${type}.\`);
    } finally {
      setDeleteDialog({ open: false, type: "state", id: "", title: "", citiesCount: 0, deleteLinkedCities: false });
    }
  };

  // Quick switch from State card to Cities tab pre-filtered
  const handleViewCitiesForState = (stateItem: any) => {
    setSelectedStateFilter(stateItem._id || stateItem.name);
    setActiveTab("cities");
    setCityPage(1);
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16 p-4 sm:p-6">
      
      {/* ======================================================== */}
      {/* 1. HEADER BANNER */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-10 shadow-2xl bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#3A506B] text-white isolate">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary-orange/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-3xl shadow-inner flex items-center justify-center shrink-0 border border-white/15 backdrop-blur-xl">
              <Globe2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary-orange drop-shadow-md" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-orange/20 border border-primary-orange/40 text-primary-orange text-xs font-bold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Portal
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white font-heading">
                Geographic Hierarchy & Master Data
              </h2>
              <p className="text-gray-300 mt-1.5 font-medium text-sm sm:text-base max-w-xl">
                Configure platform coverage across Indian States and Cities with full CRUD operations and relational hierarchy.
              </p>
            </div>
          </div>
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center">
              <span className="block text-2xl font-black text-white font-heading">{states.length}</span>
              <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">States</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center">
              <span className="block text-2xl font-black text-primary-orange font-heading">{cities.length}</span>
              <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Cities</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center col-span-2 sm:col-span-1">
              <span className="block text-2xl font-black text-emerald-400 font-heading">100%</span>
              <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Linked</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. ALERTS / NOTIFICATIONS */}
      {/* ======================================================== */}
      {message.text && (
        <div className={\`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-md border animate-in slide-in-from-top-2 duration-300 \${
          message.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        }\`}>
          <div className="flex items-center gap-3">
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ type: "", text: "" })} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. NAVIGATION TABS */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-200 pb-4">
        <div className="inline-flex bg-gray-100/90 p-1.5 rounded-2xl shadow-inner border border-gray-200">
          <button
            onClick={() => { setActiveTab("states"); setEditingStateId(null); }}
            className={\`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 \${
              activeTab === "states"
                ? "bg-white text-primary-navy shadow-md scale-[1.02]"
                : "text-gray-500 hover:text-gray-800"
            }\`}
          >
            <Globe2 className="w-4 h-4 text-primary-orange" />
            <span>1. States ({states.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab("cities"); setEditingCityId(null); }}
            className={\`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 \${
              activeTab === "cities"
                ? "bg-white text-primary-navy shadow-md scale-[1.02]"
                : "text-gray-500 hover:text-gray-800"
            }\`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>2. Cities ({cities.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab("services"); setEditingServiceId(null); }}
            className={\`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 \${
              activeTab === "services"
                ? "bg-white text-primary-navy shadow-md scale-[1.02]"
                : "text-gray-500 hover:text-gray-800"
            }\`}
          >
            <Wrench className="w-4 h-4 text-emerald-600" />
            <span>3. Services Catalog</span>
          </button>
        </div>

        {activeTab === "cities" && selectedStateFilter !== "ALL" && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3.5 py-1.5 rounded-xl">
            <span>Filtered by State: <strong>{states.find((s: any) => s._id === selectedStateFilter || s.name === selectedStateFilter)?.name || selectedStateFilter}</strong></span>
            <button 
              onClick={() => setSelectedStateFilter("ALL")}
              className="text-blue-600 hover:text-blue-900 ml-1 font-bold"
            >
              Clear Filter ✕
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. TAB 1: STATES MANAGEMENT (Geographic Hierarchy Level 1) */}
      {/* ======================================================== */}
      {activeTab === "states" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Form: Add / Edit State */}
          <div className="lg:col-span-4">
            <Card className="bg-white shadow-xl border-gray-100 rounded-3xl overflow-hidden sticky top-6">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-orange-50/30 p-6 border-b border-gray-100">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe2 className="w-5 h-5 text-primary-orange" />
                    <span>{editingStateId ? "Edit State" : "Add New State"}</span>
                  </span>
                  {editingStateId && (
                    <button
                      type="button"
                      onClick={() => { setEditingStateId(null); setNewState({ name: "", code: "", country: "India", isActive: true }); }}
                      className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  {editingStateId 
                    ? "Updating state name will automatically update all linked cities." 
                    : "Create a state or union territory at the top of the geographic hierarchy."}
                </p>
              </CardHeader>
              
              <CardContent className="p-6">
                <form onSubmit={handleSaveState} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      State Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Maharashtra, Delhi, Karnataka"
                      value={newState.name}
                      onChange={(e) => setNewState({ ...newState, name: e.target.value })}
                      required
                      className="h-11 bg-gray-50/50 border-gray-200 text-sm focus:border-primary-orange"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        State Code
                      </label>
                      <Input
                        placeholder="e.g. MH, DL, KA"
                        maxLength={6}
                        value={newState.code}
                        onChange={(e) => setNewState({ ...newState, code: e.target.value.toUpperCase() })}
                        className="h-11 bg-gray-50/50 border-gray-200 text-sm uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Country
                      </label>
                      <Input
                        value={newState.country}
                        disabled
                        className="h-11 bg-gray-100 text-gray-500 border-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="stateActiveToggle"
                      checked={newState.isActive}
                      onChange={(e) => setNewState({ ...newState, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-primary-orange focus:ring-primary-orange/20 cursor-pointer"
                    />
                    <label htmlFor="stateActiveToggle" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Mark as Active & Operational
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={createStateMutation.isPending || updateStateMutation.isPending}
                    className="w-full h-11 bg-primary-orange hover:bg-primary-orange/90 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                  >
                    {createStateMutation.isPending || updateStateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    <span>{editingStateId ? "Update State Details" : "Create State"}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Table: States List */}
          <div className="lg:col-span-8">
            <Card className="bg-white shadow-xl border-gray-100 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Globe2 className="w-5 h-5 text-primary-orange" />
                    <span>Registered States ({filteredStates.length})</span>
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">Hierarchical Level 1 — Click &quot;View Cities&quot; to inspect all cities linked to that state.</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search state or code..."
                    value={stateSearch}
                    onChange={(e) => { setStateSearch(e.target.value); setStatePage(1); }}
                    className="pl-9 h-10 bg-white border-gray-200 text-xs rounded-xl"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isStatesLoading ? (
                  <div className="flex items-center justify-center py-20 text-primary-orange">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : filteredStates.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    No states found matching your search.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {paginatedStates.map((stateItem: any) => (
                      <div
                        key={stateItem._id}
                        className="p-4 sm:p-5 hover:bg-orange-50/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-primary-orange font-bold font-mono text-sm shrink-0">
                            {stateItem.code || stateItem.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900 text-base">{stateItem.name}</h4>
                              <span className={\`px-2 py-0.5 text-[10px] font-bold rounded-full border \${
                                stateItem.isActive !== false
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }\`}>
                                {stateItem.isActive !== false ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                              <span>Country: {stateItem.country || "India"}</span>
                              <span>•</span>
                              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                {stateItem.citiesCount || 0} Cities Linked
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCitiesForState(stateItem)}
                            className="h-9 px-3 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
                          >
                            <Building2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            <span>View Cities</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditState(stateItem)}
                            className="h-9 w-9 p-0 text-gray-600 hover:text-blue-600 rounded-xl"
                            title="Edit State"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerDelete("state", stateItem)}
                            className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 rounded-xl"
                            title="Delete State"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>

              {/* Pagination */}
              {totalStatePages > 1 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <span className="text-xs text-gray-500 font-semibold">
                    Page {statePage} of {totalStatePages} ({filteredStates.length} states)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatePage(p => Math.max(1, p - 1))}
                      disabled={statePage === 1}
                      className="rounded-xl h-8 px-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatePage(p => Math.min(totalStatePages, p + 1))}
                      disabled={statePage >= totalStatePages}
                      className="rounded-xl h-8 px-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TAB 2: CITIES MANAGEMENT (Geographic Hierarchy Level 2) */}
      {/* ======================================================== */}
      {activeTab === "cities" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Form: Add / Edit City */}
          <div className="lg:col-span-4">
            <Card className="bg-white shadow-xl border-gray-100 rounded-3xl overflow-hidden sticky top-6">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50/30 p-6 border-b border-gray-100">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span>{editingCityId ? "Edit City" : "Add New City"}</span>
                  </span>
                  {editingCityId && (
                    <button
                      type="button"
                      onClick={() => { setEditingCityId(null); setNewCity({ name: "", stateId: "", state: "", isActive: true }); }}
                      className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Cities must be linked to their respective State for correct routing in booking flows.
                </p>
              </CardHeader>
              
              <CardContent className="p-6">
                <form onSubmit={handleSaveCity} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      City Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. South Delhi, Pune, Indiranagar"
                      value={newCity.name}
                      onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                      required
                      className="h-11 bg-gray-50/50 border-gray-200 text-sm focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Linked State <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newCity.stateId || ""}
                      onChange={(e) => {
                        const sId = e.target.value;
                        const sObj = states.find((s: any) => s._id === sId);
                        setNewCity({ ...newCity, stateId: sId, state: sObj?.name || "" });
                      }}
                      required
                      className="w-full h-11 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="">-- Select Parent State --</option>
                      {states.map((st: any) => (
                        <option key={st._id} value={st._id}>
                          {st.name} {st.code ? \`(\${st.code})\` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="cityActiveToggle"
                      checked={newCity.isActive}
                      onChange={(e) => setNewCity({ ...newCity, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                    />
                    <label htmlFor="cityActiveToggle" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Mark as Active for Customer & Partner Bookings
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={createCityMutation.isPending || updateCityMutation.isPending}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                  >
                    {createCityMutation.isPending || updateCityMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    <span>{editingCityId ? "Update City Details" : "Create & Link City"}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Table: Cities List with State Filter */}
          <div className="lg:col-span-8">
            <Card className="bg-white shadow-xl border-gray-100 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span>Registered Cities ({filteredCities.length})</span>
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">Hierarchical Level 2 — Linked directly to corresponding state.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                  {/* State Filter Dropdown */}
                  <div className="w-full sm:w-48">
                    <select
                      value={selectedStateFilter}
                      onChange={(e) => { setSelectedStateFilter(e.target.value); setCityPage(1); }}
                      className="w-full h-10 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="ALL">All States ({states.length})</option>
                      {states.map((st: any) => (
                        <option key={st._id} value={st._id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search City */}
                  <div className="relative w-full sm:w-48">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search city..."
                      value={citySearch}
                      onChange={(e) => { setCitySearch(e.target.value); setCityPage(1); }}
                      className="pl-9 h-10 bg-white border-gray-200 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isCitiesLoading ? (
                  <div className="flex items-center justify-center py-20 text-blue-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : filteredCities.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    No cities found for this search or state filter.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {paginatedCities.map((cityItem: any) => {
                      const linkedStateName = typeof cityItem.stateId === "object" && cityItem.stateId?.name
                        ? cityItem.stateId.name 
                        : cityItem.state || "Unassigned";

                      return (
                        <div
                          key={cityItem._id}
                          className="p-4 sm:p-5 hover:bg-blue-50/20 transition-colors flex items-center justify-between gap-4 group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900 text-sm sm:text-base">{cityItem.name}</h4>
                                <span className={\`px-2 py-0.5 text-[10px] font-bold rounded-full border \${
                                  cityItem.isActive !== false
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-gray-100 text-gray-600 border-gray-200"
                                }\`}>
                                  {cityItem.isActive !== false ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                                  <Globe2 className="w-3 h-3 text-primary-orange" />
                                  <span>State: {linkedStateName}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCity(cityItem)}
                              className="h-9 w-9 p-0 text-gray-600 hover:text-blue-600 rounded-xl"
                              title="Edit City"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => triggerDelete("city", cityItem)}
                              className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 rounded-xl"
                              title="Delete City"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>

              {/* Pagination */}
              {totalCityPages > 1 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <span className="text-xs text-gray-500 font-semibold">
                    Page {cityPage} of {totalCityPages} ({filteredCities.length} cities)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCityPage(p => Math.max(1, p - 1))}
                      disabled={cityPage === 1}
                      className="rounded-xl h-8 px-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCityPage(p => Math.min(totalCityPages, p + 1))}
                      disabled={cityPage >= totalCityPages}
                      className="rounded-xl h-8 px-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. TAB 3: SERVICES CATALOG (Legacy Services Management) */}
      {/* ======================================================== */}
      {activeTab === "services" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4">
            <Card className="bg-white shadow-xl border-gray-100 rounded-3xl overflow-hidden sticky top-6">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-emerald-50/30 p-6 border-b border-gray-100">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-emerald-600" />
                    <span>{editingServiceId ? "Edit Service" : "Add New Service"}</span>
                  </span>
                  {editingServiceId && (
                    <button
                      type="button"
                      onClick={() => { setEditingServiceId(null); setNewService({ name: "", description: "" }); }}
                      className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
                    >
                      Cancel
                    </button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveService} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Service Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Periodic Oil Service"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      required
                      className="h-11 bg-gray-50/50 border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="Brief details of service inclusions..."
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      rows={3}
                      className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span>{editingServiceId ? "Update Service" : "Add Service"}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card className="bg-white shadow-xl border-gray-100 rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-emerald-600" />
                  <span>Configured Services ({services.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-gray-100">
                {paginatedServices.map((s: any) => (
                  <div key={s._id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{s.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{s.description || "Standard platform package"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingServiceId(s._id);
                          setNewService({ name: s.name, description: s.description || "" });
                        }}
                        className="h-9 w-9 p-0 text-gray-600 rounded-xl"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerDelete("service", s)}
                        className="h-9 w-9 p-0 text-red-500 rounded-xl"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {deleteDialog.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 font-heading">
                Delete {deleteDialog.type === "state" ? "State" : deleteDialog.type === "city" ? "City" : "Service"}?
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Are you sure you want to delete <strong>&quot;{deleteDialog.title}&quot;</strong>? This action cannot be reversed.
              </p>
            </div>

            {deleteDialog.type === "state" && (deleteDialog.citiesCount || 0) > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
                <p className="text-amber-800 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Warning: {deleteDialog.citiesCount} cities are currently linked to this state.</span>
                </p>
                <label className="flex items-center gap-2 cursor-pointer text-amber-900 font-medium">
                  <input
                    type="checkbox"
                    checked={deleteDialog.deleteLinkedCities}
                    onChange={(e) => setDeleteDialog(prev => ({ ...prev, deleteLinkedCities: e.target.checked }))}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-400 cursor-pointer"
                  />
                  <span>Also permanently cascade delete all {deleteDialog.citiesCount} linked cities</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialog({ open: false, type: "state", id: "", title: "", citiesCount: 0, deleteLinkedCities: false })}
                className="rounded-xl px-4 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 text-xs font-bold shadow-md shadow-red-200"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
`;

fs.writeFileSync(targetPath, code, 'utf8');
console.log('✓ Successfully written upgraded MasterDataPage to ' + targetPath);
