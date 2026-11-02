"use client";

import { ShelterAddListingForm } from "@/components/shelter-add-listing-form";
import { ShelterEditListingDialog } from "@/components/shelter-edit-listing-dialog";
import { ShelterDenialGameClient } from "@/components/shelter-denial-game-client";
import { ShelterListingPhoto } from "@/components/shelter-listing-photo";
import { ShelterDeathScreen } from "@/components/shelter-death-screen";
import { ShelterPendingScreen } from "@/components/shelter-pending-screen";
import { ShelterRolePicker } from "@/components/shelter-role-picker";
import { ShelterWaiver } from "@/components/shelter-waiver";
import { ShelterWorkerBanner } from "@/components/shelter-worker-banner";
import { ShelterWorkerQueue } from "@/components/shelter-worker-queue";
import { ShelterWorkerQuip } from "@/components/shelter-worker-quip";
import {
  submitShelterAdoptionRequest,
  type ShelterPet,
} from "@/lib/shelter";
import type { ShelterRole } from "@/lib/shelter-worker-lines";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

type Phase =
  | "browse"
  | "waiver"
  | "pending"
  | "death"
  | "deathMovie"
  | "success";

type ShelterAppClientProps = {
  initialPets: ShelterPet[];
};

export function ShelterAppClient({ initialPets }: ShelterAppClientProps) {
  const [pets, setPets] = useState(initialPets);
  const [role, setRole] = useState<ShelterRole | null>(null);
  const [phase, setPhase] = useState<Phase>("browse");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workerQuipPet, setWorkerQuipPet] = useState<ShelterPet | null>(null);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adoptedName, setAdoptedName] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [pendingPetName, setPendingPetName] = useState<string | null>(null);
  const [pendingVisitorName, setPendingVisitorName] = useState<string | null>(
    null,
  );
  const [editingPet, setEditingPet] = useState<ShelterPet | null>(null);

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedId) ?? null,
    [pets, selectedId],
  );

  const filteredPets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pets;
    return pets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q),
    );
  }, [pets, search]);

  const resetBrowse = () => {
    setPhase("browse");
    setSelectedId(null);
    setWorkerQuipPet(null);
    setError(null);
    setAdoptedName(null);
    setPendingRequestId(null);
    setPendingPetName(null);
    setPendingVisitorName(null);
  };

  const switchRole = () => {
    setRole(null);
    resetBrowse();
  };

  const pickRole = (next: ShelterRole) => {
    setRole(next);
    resetBrowse();
  };

  const askAvailability = (pet: ShelterPet) => {
    setSelectedId(pet.id);
    setError(null);

    if (role === "worker") {
      setWorkerQuipPet(pet);
      return;
    }

    if (pet.isAvailable) {
      setPhase("waiver");
    } else {
      setPhase("death");
    }
  };

  const handlePendingApproved = useCallback((petName: string) => {
    if (selectedId) {
      setPets((prev) =>
        prev.map((p) =>
          p.id === selectedId ? { ...p, isAvailable: false } : p,
        ),
      );
    }
    setAdoptedName(petName);
    setPhase("success");
    setPendingRequestId(null);
  }, [selectedId]);

  const handlePendingDenied = useCallback(() => {
    setPhase("deathMovie");
    setPendingRequestId(null);
  }, []);

  const handleAdopt = async (visitorName: string, signaturePng: string) => {
    if (!selectedPet) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const result = await submitShelterAdoptionRequest(
        supabase,
        selectedPet.id,
        visitorName,
        signaturePng,
      );

      if (result.ok) {
        setPendingRequestId(result.requestId);
        setPendingPetName(result.petName);
        setPendingVisitorName(visitorName.trim());
        setPhase("pending");
        return;
      }

      if (result.code === "unavailable") {
        setPets((prev) =>
          prev.map((p) =>
            p.id === selectedPet.id ? { ...p, isAvailable: false } : p,
          ),
        );
        setPhase("death");
        return;
      }

      if (result.code === "already_pending") {
        setError("Someone else is already waiting on Gary for this listing.");
        return;
      }

      setError("Could not submit waiver. Check your name and signature.");
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDecided = (petId: string, approved: boolean) => {
    if (approved) {
      setPets((prev) =>
        prev.map((p) => (p.id === petId ? { ...p, isAvailable: false } : p)),
      );
    }
  };

  const askButtonLabel =
    role === "worker" ? "Check the system (trust me)" : "Ask if available";

  const handleListingAdded = (pet: ShelterPet) => {
    setPets((prev) =>
      [...prev, pet].sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const handleListingUpdated = (pet: ShelterPet) => {
    setPets((prev) =>
      prev
        .map((p) => (p.id === pet.id ? pet : p))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const showBrowse =
    role !== null &&
    phase === "browse" &&
    !workerQuipPet;

  return (
    <div className="relative w-full max-w-4xl">
      {role === null && <ShelterRolePicker onPick={pickRole} />}

      {role !== null && workerQuipPet && (
        <ShelterWorkerQuip
          pet={workerQuipPet}
          available={workerQuipPet.isAvailable}
          onClose={() => {
            setWorkerQuipPet(null);
            setSelectedId(null);
          }}
        />
      )}

      {role === "visitor" && phase === "death" && selectedPet && (
        <ShelterDeathScreen petName={selectedPet.name} onRetry={resetBrowse} />
      )}

      {role === "visitor" && phase === "deathMovie" && (
        <ShelterDenialGameClient
          visitorName={pendingVisitorName ?? undefined}
          petName={pendingPetName ?? selectedPet?.name}
          onComplete={resetBrowse}
        />
      )}

      {role === "visitor" &&
        phase === "pending" &&
        selectedPet &&
        pendingRequestId &&
        pendingPetName && (
          <ShelterPendingScreen
            requestId={pendingRequestId}
            pet={selectedPet}
            petName={pendingPetName}
            onApproved={handlePendingApproved}
            onDenied={handlePendingDenied}
          />
        )}

      {role !== null && phase === "success" && adoptedName && (
        <div className="shelter-glass-card rounded-3xl p-8 text-center">
          <p className="text-5xl" aria-hidden>🎉</p>
          <h2 className="mt-4 text-3xl font-extrabold text-[var(--shelter-ink)]">
            {adoptedName} is going home with you!
          </h2>
          <p className="mt-3 text-[var(--shelter-muted)]">
            Gary approved it. Your signed waiver is on file. (And you survived
            the pig.)
          </p>
          <button
            type="button"
            onClick={resetBrowse}
            className="shelter-btn-primary mt-8"
          >
            Browse more listings
          </button>
        </div>
      )}

      {role === "visitor" && phase === "waiver" && selectedPet && (
        <ShelterWaiver
          pet={selectedPet}
          submitting={submitting}
          onBack={() => setPhase("browse")}
          onSubmit={handleAdopt}
        />
      )}

      {showBrowse && (
        <div className="flex flex-col gap-6">
          {role === "worker" && (
            <>
              <ShelterWorkerBanner onSwitchRole={switchRole} />
              <ShelterWorkerQueue onRequestDecided={handleRequestDecided} />
              <ShelterAddListingForm onAdded={handleListingAdded} />
            </>
          )}

          {role === "visitor" && (
            <button
              type="button"
              onClick={switchRole}
              className="shelter-btn-ghost w-fit text-sm"
            >
              Switch role
            </button>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-[var(--shelter-ink)]">
              Search listings
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="shelter-input mt-2"
              placeholder="Name or type…"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-[var(--shelter-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--shelter-danger)]">
              {error}
            </p>
          )}

          {filteredPets.length === 0 ? (
            <p className="text-[var(--shelter-muted)]">
              {pets.length === 0
                ? "Nothing on the floor yet. Staff can add a listing above."
                : "No listings match that search."}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {filteredPets.map((pet) => (
                <li key={pet.id}>
                  <article
                    className={`shelter-glass-card flex h-full flex-col rounded-2xl p-5 ${
                      selectedId === pet.id ? "shelter-card-selected" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <ShelterListingPhoto pet={pet} size="card" />
                      <span
                        className={
                          pet.isAvailable
                            ? "shelter-badge-available"
                            : "shelter-badge-taken"
                        }
                      >
                        {pet.isAvailable ? "In shelter" : "Already home"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-[var(--shelter-ink)]">
                      {pet.name}
                    </h3>
                    <p className="text-sm font-medium text-[var(--shelter-muted)]">
                      {pet.species}
                    </p>
                    <p className="mt-2 flex-1 text-sm text-[var(--shelter-ink)]">
                      {pet.description}
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => askAvailability(pet)}
                        className="shelter-btn-primary w-full"
                      >
                        {askButtonLabel}
                      </button>
                      {role === "worker" && (
                        <button
                          type="button"
                          onClick={() => setEditingPet(pet)}
                          className="shelter-btn-ghost w-full text-sm"
                        >
                          Edit details
                        </button>
                      )}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}

          {role === "visitor" && (
            <p className="text-center text-xs text-[var(--shelter-muted)]">
              Already taken = instant game over. After you sign, Gary decides —
              deny means the pig.
            </p>
          )}
        </div>
      )}

      <ShelterEditListingDialog
        pet={editingPet}
        open={editingPet !== null}
        onClose={() => setEditingPet(null)}
        onUpdated={handleListingUpdated}
      />

      <p className="mt-10 text-center">
        <Link href="/" className="shelter-btn-ghost text-sm">
          ← All projects
        </Link>
      </p>
    </div>
  );
}
