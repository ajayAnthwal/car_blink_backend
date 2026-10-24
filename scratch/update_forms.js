const fs = require('fs');
const path = require('path');

// =========================================================================
// 1. UPDATE PartnerRegisterForm.tsx in car_blink (Partner Registration Website)
// =========================================================================
const partnerFormPath = path.resolve('..', 'car_blink', 'features', 'auth', 'components', 'PartnerRegisterForm.tsx');
if (fs.existsSync(partnerFormPath)) {
  let content = fs.readFileSync(partnerFormPath, 'utf8');

  // Add import if not present
  if (!content.includes('INDIAN_STATES')) {
    content = content.replace(
      'import Input from "@/components/ui/Input";',
      'import Input from "@/components/ui/Input";\nimport { INDIAN_STATES, getCitiesForState } from "@/config/locations.data";'
    );
  }

  // Look for the City, State, PIN inputs block
  const oldInputsRegex = /\{\/\* City, State, PIN \*\/\}[\s\S]*?<div className="grid grid-cols-3 gap-2 sm:gap-3">[\s\S]*?name="city"[\s\S]*?name="state"[\s\S]*?name="pincode"[\s\S]*?<\/div>[\s\S]*?<\/div>/;

  const newInputsBlock = `{/* City, State, PIN - Dynamic State & City Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider mb-1">
                  STATE <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="state"
                    value={formData.state}
                    onChange={(e) => {
                      const newState = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        state: newState,
                        city: "",
                      }));
                      setError("");
                    }}
                    required
                    className="w-full h-11 px-3 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue appearance-none transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
                    <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider mb-1">
                  CITY <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    disabled={!formData.state}
                    className={\`w-full h-11 px-3 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue appearance-none transition-all cursor-pointer shadow-xs \${
                      !formData.state ? "bg-gray-50 text-gray-400 cursor-not-allowed opacity-75" : ""
                    }\`}
                  >
                    <option value="">{formData.state ? "Select City" : "Select State First"}</option>
                    {getCitiesForState(formData.state).map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
                    <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-text-dark uppercase tracking-wider mb-1">
                  PIN CODE <span className="text-red-500">*</span>
                </label>
                <Input
                  name="pincode"
                  placeholder="6 digits"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  className="h-11 bg-white border-amber-200/90 text-xs font-mono placeholder:text-gray-400"
                />
              </div>
            </div>`;

  if (oldInputsRegex.test(content)) {
    content = content.replace(oldInputsRegex, newInputsBlock);
    fs.writeFileSync(partnerFormPath, content, 'utf8');
    console.log('✓ Successfully updated car_blink: PartnerRegisterForm.tsx');
  } else {
    console.error('✗ Pattern mismatch in car_blink: PartnerRegisterForm.tsx');
  }
} else {
  console.error('File not found:', partnerFormPath);
}

// =========================================================================
// 2. UPDATE register/page.tsx in car_blink_dashboard (Partner Registration Dashboard)
// =========================================================================
const dashRegisterPath = path.resolve('..', 'car_blink_dashboard', 'app', '(auth)', 'register', 'page.tsx');
if (fs.existsSync(dashRegisterPath)) {
  let content = fs.readFileSync(dashRegisterPath, 'utf8');

  // Add import if not present
  if (!content.includes('INDIAN_STATES')) {
    content = content.replace(
      'import { Input } from "@/components/ui/input";',
      'import { Input } from "@/components/ui/input";\nimport { INDIAN_STATES, getCitiesForState } from "@/lib/data/locations";'
    );
  }

  const oldDashBlockRegex = /\{\/\* City, State, PIN \*\/\}[\s\S]*?<div className="grid grid-cols-3 gap-2 sm:gap-3">[\s\S]*?name="city"[\s\S]*?name="state"[\s\S]*?name="pincode"[\s\S]*?<\/div>[\s\S]*?<\/div>/;

  const newDashBlock = `{/* City, State, PIN - Dynamic State & City Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      State *
                    </label>
                    <div className="relative">
                      <select
                        name="state"
                        value={formData.state}
                        onChange={(e) => {
                          const newState = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            state: newState,
                            city: "",
                          }));
                          setError("");
                        }}
                        required
                        className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-orange/30 focus:border-primary-orange appearance-none transition-all cursor-pointer"
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <svg className="fill-current h-3.5 w-3.5" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      City *
                    </label>
                    <div className="relative">
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        disabled={!formData.state}
                        className={\`w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-orange/30 focus:border-primary-orange appearance-none transition-all cursor-pointer \${
                          !formData.state ? "bg-gray-50 text-gray-400 cursor-not-allowed opacity-75" : ""
                        }\`}
                      >
                        <option value="">{formData.state ? "Select City" : "Select State First"}</option>
                        {getCitiesForState(formData.state).map((ct) => (
                          <option key={ct} value={ct}>
                            {ct}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <svg className="fill-current h-3.5 w-3.5" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      PIN Code *
                    </label>
                    <Input
                      name="pincode"
                      placeholder="6 digits"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={handleChange}
                      required
                      className="h-10 bg-white border-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>`;

  if (oldDashBlockRegex.test(content)) {
    content = content.replace(oldDashBlockRegex, newDashBlock);
    fs.writeFileSync(dashRegisterPath, content, 'utf8');
    console.log('✓ Successfully updated car_blink_dashboard: register/page.tsx');
  } else {
    console.error('✗ Pattern mismatch in car_blink_dashboard: register/page.tsx');
  }
} else {
  console.error('File not found:', dashRegisterPath);
}

// =========================================================================
// 3. UPDATE ProfileForm.tsx in car_blink_dashboard (User Dashboard Profile)
// =========================================================================
const profileFormPath = path.resolve('..', 'car_blink_dashboard', 'features', 'users', 'components', 'ProfileForm.tsx');
if (fs.existsSync(profileFormPath)) {
  let content = fs.readFileSync(profileFormPath, 'utf8');

  // Add import if not present
  if (!content.includes('INDIAN_STATES')) {
    content = content.replace(
      'import { useCities } from "@/features/customer/hooks/useCustomerQueries";',
      'import { useCities } from "@/features/customer/hooks/useCustomerQueries";\nimport { INDIAN_STATES, getCitiesForState } from "@/lib/data/locations";'
    );
  }

  // Update states and filteredCities derivation
  const oldStateDerivation = `  const states = Array.from(new Set((citiesData || []).map((c: any) => c.state))).filter(Boolean).map((s: any) => ({ name: s, value: s }));
  
  const [selectedState, setSelectedState] = useState("");
  const filteredCities = (citiesData || []).filter((c: any) => selectedState ? c.state === selectedState : true).map((c: any) => ({ value: c._id, label: c.name }));`;

  const newStateDerivation = `  // Comprehensive Indian States list merged with backend cities
  const backendStates = Array.from(new Set((citiesData || []).map((c: any) => c.state))).filter(Boolean) as string[];
  const allStatesList = Array.from(new Set([...INDIAN_STATES, ...backendStates])).sort();
  const states = allStatesList.map((s: string) => ({ name: s, value: s }));
  
  const [selectedState, setSelectedState] = useState("");
  
  // Combine backend DB cities (with _id) and master locations list
  const stateMasterCities = getCitiesForState(selectedState);
  const backendMatchingCities = (citiesData || []).filter((c: any) => selectedState ? c.state?.toLowerCase() === selectedState.toLowerCase() : true);
  
  // Build clean unified list of city options
  const cityOptionsMap = new Map<string, { value: string; label: string }>();
  backendMatchingCities.forEach((c: any) => {
    cityOptionsMap.set(c.name.toLowerCase(), { value: c._id, label: c.name });
  });
  stateMasterCities.forEach((cityName: string) => {
    if (!cityOptionsMap.has(cityName.toLowerCase())) {
      // For cities not yet in backend DB, value is city name
      cityOptionsMap.set(cityName.toLowerCase(), { value: cityName, label: cityName });
    }
  });
  const filteredCities = Array.from(cityOptionsMap.values()).sort((a, b) => a.label.localeCompare(b.label));`;

  if (content.includes(oldStateDerivation)) {
    content = content.replace(oldStateDerivation, newStateDerivation);
  }

  // Also in onSubmit: if cityId is a city name string (not 24-hex mongo id), ensure no CastError
  const oldOnSubmitBlock = `      const payload: any = { ...data };
      if (!payload.cityId || payload.cityId.trim() === "") delete payload.cityId;
      if (!payload.state || payload.state.trim() === "") delete payload.state;
      if (!payload.email || payload.email.trim() === "") delete payload.email;`;

  const newOnSubmitBlock = `      const payload: any = { ...data };
      if (payload.cityId) {
        // If cityId is not a 24-character hex ObjectId, search backend DB or store in address
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(payload.cityId);
        if (!isMongoId) {
          const match = (citiesData || []).find((c: any) => c.name.toLowerCase() === payload.cityId.toLowerCase());
          if (match && match._id) {
            payload.cityId = match._id;
          } else {
            // Do not send non-hex ID to ObjectId field to prevent CastError
            delete payload.cityId;
          }
        }
      } else {
        delete payload.cityId;
      }
      if (!payload.state || payload.state.trim() === "") delete payload.state;
      if (!payload.email || payload.email.trim() === "") delete payload.email;`;

  if (content.includes(oldOnSubmitBlock)) {
    content = content.replace(oldOnSubmitBlock, newOnSubmitBlock);
  }

  fs.writeFileSync(profileFormPath, content, 'utf8');
  console.log('✓ Successfully updated car_blink_dashboard: ProfileForm.tsx');
} else {
  console.error('File not found:', profileFormPath);
}

// =========================================================================
// 4. UPDATE BookingForm.tsx & customer/bookings/new/page.tsx in car_blink_dashboard
// =========================================================================
const bookingPagePath = path.resolve('..', 'car_blink_dashboard', 'app', '(customer)', 'customer', 'bookings', 'new', 'page.tsx');
if (fs.existsSync(bookingPagePath)) {
  let content = fs.readFileSync(bookingPagePath, 'utf8');

  if (!content.includes('INDIAN_STATES')) {
    content = content.replace(
      'import { useServices, useCities, useCustomerVehicles, useCreateBooking } from "@/features/customer/hooks/useCustomerQueries";',
      'import { useServices, useCities, useCustomerVehicles, useCreateBooking } from "@/features/customer/hooks/useCustomerQueries";\nimport { INDIAN_STATES, getCitiesForState } from "@/lib/data/locations";'
    );
  }

  const oldStatesLine = `  const states = Array.from(new Set((citiesData || []).map((c: any) => c.state))).filter(Boolean).map((s: any) => ({ name: s, value: s }));
  
  const [selectedState, setSelectedState] = useState("");
  const filteredCities = (citiesData || []).filter((c: any) => c.state === selectedState);`;

  const newStatesLine = `  const backendStates = Array.from(new Set((citiesData || []).map((c: any) => c.state))).filter(Boolean) as string[];
  const allStatesList = Array.from(new Set([...INDIAN_STATES, ...backendStates])).sort();
  const states = allStatesList.map((s: string) => ({ name: s, value: s }));
  
  const [selectedState, setSelectedState] = useState("");
  
  // Combine backend DB cities (with _id) and master locations list
  const stateMasterCities = getCitiesForState(selectedState);
  const backendMatchingCities = (citiesData || []).filter((c: any) => selectedState ? c.state?.toLowerCase() === selectedState.toLowerCase() : true);
  
  const cityMap = new Map<string, any>();
  backendMatchingCities.forEach((c: any) => {
    cityMap.set(c.name.toLowerCase(), { _id: c._id, name: c.name, state: c.state });
  });
  stateMasterCities.forEach((name: string) => {
    if (!cityMap.has(name.toLowerCase())) {
      cityMap.set(name.toLowerCase(), { _id: name, name, state: selectedState });
    }
  });
  const filteredCities = Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name));`;

  if (content.includes(oldStatesLine)) {
    content = content.replace(oldStatesLine, newStatesLine);
    fs.writeFileSync(bookingPagePath, content, 'utf8');
    console.log('✓ Successfully updated car_blink_dashboard: customer/bookings/new/page.tsx');
  }
}

// Now update BookingForm.tsx to render State and City dropdowns in the Service Location section
const bookingFormPath = path.resolve('..', 'car_blink_dashboard', 'features', 'customer', 'components', 'bookings', 'BookingForm.tsx');
if (fs.existsSync(bookingFormPath)) {
  let content = fs.readFileSync(bookingFormPath, 'utf8');

  // Find the location section and insert the State and City dynamic dropdowns
  const oldLocBlock = `          {/* Manual Option: Type Address / Area */}
          <div className="space-y-1.5">`;

  const newLocBlock = `          {/* Dynamic State and City Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-dark flex items-center gap-1">
                <span>Select State</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                value={selectedState || ""}
                onChange={(e) => {
                  const newState = e.target.value;
                  setValue("state", newState);
                  setValue("cityId", "");
                  onStateChange(newState);
                }}
                className="w-full h-11 px-3.5 py-2 rounded-xl border border-neutral-muted/30 bg-neutral-bg text-sm font-medium text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary-orange/20 focus:border-primary-orange transition-all cursor-pointer shadow-xs"
              >
                <option value="">Select State</option>
                {states.map((st: any) => (
                  <option key={st.value || st.name} value={st.value || st.name}>
                    {st.name || st.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-dark flex items-center gap-1">
                <span>Select City</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                value={watch("cityId") || ""}
                onChange={(e) => setValue("cityId", e.target.value)}
                disabled={!selectedState}
                className={\`w-full h-11 px-3.5 py-2 rounded-xl border border-neutral-muted/30 bg-neutral-bg text-sm font-medium text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary-orange/20 focus:border-primary-orange transition-all cursor-pointer shadow-xs \${
                  !selectedState ? "opacity-60 cursor-not-allowed bg-gray-100" : ""
                }\`}
              >
                <option value="">{selectedState ? "Select City" : "Select State First"}</option>
                {cities.map((ct: any) => (
                  <option key={ct._id || ct.name} value={ct._id || ct.name}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Manual Option: Type Address / Area */}
          <div className="space-y-1.5">`;

  if (content.includes(oldLocBlock) && !content.includes('Select State')) {
    content = content.replace(oldLocBlock, newLocBlock);
    fs.writeFileSync(bookingFormPath, content, 'utf8');
    console.log('✓ Successfully updated car_blink_dashboard: BookingForm.tsx');
  }
}
