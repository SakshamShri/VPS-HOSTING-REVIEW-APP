import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Country, State, City } from "country-state-city";

export function CategoryMaster() {
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");

  // Restrict to India and Brazil for this admin UI
  const countries = useMemo(
    () => Country.getAllCountries().filter((c) => ["IN", "BR"].includes(c.isoCode)),
    []
  );

  const states = useMemo(
    () =>
      selectedCountry
        ? State.getStatesOfCountry(selectedCountry)
        : [],
    [selectedCountry]
  );

  const cities = useMemo(
    () =>
      selectedCountry && selectedState
        ? City.getCitiesOfState(selectedCountry, selectedState)
        : [],
    [selectedCountry, selectedState]
  );

  const handleCountryChange = (countryIsoCode: string) => {
    setSelectedCountry(countryIsoCode);
    setSelectedState("");
    setSelectedCity("");
  };

  const handleStateChange = (stateIsoCode: string) => {
    setSelectedState(stateIsoCode);
    setSelectedCity("");
  };

  return (
    <div className="min-h-screen bg-muted px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create Category
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define where this category applies using a strict Country → State → City hierarchy.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.isoCode} value={country.isoCode}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={selectedState}
                onValueChange={handleStateChange}
                disabled={!selectedCountry}
              >
                <SelectTrigger id="state">
                  <SelectValue
                    placeholder={
                      selectedCountry ? "Select a state" : "Select a country first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.isoCode} value={state.isoCode}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select
                value={selectedCity}
                onValueChange={setSelectedCity}
                disabled={!selectedState}
              >
                <SelectTrigger id="city">
                  <SelectValue
                    placeholder={selectedState ? "Select a city" : "Select a state first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={`${city.latitude}-${city.longitude}-${city.name}`} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button disabled className="w-full">
                Save Category
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
