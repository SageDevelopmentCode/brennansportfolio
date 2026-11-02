"use client";

import { GymApprovedScreen } from "@/components/gym-approved-screen";
import { GymCheckInForm } from "@/components/gym-check-in-form";
import { GymDenialStory } from "@/components/gym-denial-story";
import { GymEmployeeDesk } from "@/components/gym-employee-desk";
import { GymFamilyCodeForm } from "@/components/gym-family-code-form";
import { GymFamilySimulatorPicker } from "@/components/gym-family-simulator-picker";
import {
  GymFamilyLookup,
  GymFamilyWaiting,
} from "@/components/gym-family-waiting";
import { GymOwnerClasses } from "@/components/gym-owner-classes";
import { GymOwnerQueue } from "@/components/gym-owner-queue";
import { GymRolePicker } from "@/components/gym-role-picker";
import { GymTeacherDashboard } from "@/components/gym-teacher-dashboard";
import { GymTeacherPicker } from "@/components/gym-teacher-picker";
import { getGymCheckIn, type GymCheckInRequest } from "@/lib/gym";
import type { GymRole } from "@/lib/gym-roles";
import type { GymTeacherProfile } from "@/lib/gym-teachers";
import { primeLennySpeechFromUserGesture } from "@/lib/gym-lenny-speech";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

type FamilyPhase =
  | "simPicker"
  | "lookup"
  | "submit"
  | "waiting"
  | "enterFamilyCode"
  | "approved"
  | "deniedStory";

function postApprovalPhase(request: GymCheckInRequest): FamilyPhase {
  if (request.status !== "approved") return "deniedStory";
  return request.familyCode ? "approved" : "enterFamilyCode";
}

export function GymAppClient() {
  const [role, setRole] = useState<GymRole | null>(null);
  const [familyPhase, setFamilyPhase] = useState<FamilyPhase>("simPicker");
  const [activeRequest, setActiveRequest] = useState<GymCheckInRequest | null>(
    null,
  );
  const [approvedName, setApprovedName] = useState<string | null>(null);
  const [savedFamilyCode, setSavedFamilyCode] = useState<string | null>(null);
  const [lastDeskCode, setLastDeskCode] = useState<string | null>(null);
  const [lastDeskFamily, setLastDeskFamily] = useState<string | null>(null);
  const [activeTeacher, setActiveTeacher] = useState<GymTeacherProfile | null>(
    null,
  );

  useEffect(() => {
    const prime = () => primeLennySpeechFromUserGesture();
    window.addEventListener("pointerdown", prime, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", prime, { capture: true });
  }, []);

  const switchRole = () => {
    setRole(null);
    setFamilyPhase("simPicker");
    setActiveRequest(null);
    setApprovedName(null);
    setSavedFamilyCode(null);
    setLastDeskCode(null);
    setLastDeskFamily(null);
    setActiveTeacher(null);
  };

  const pickRole = (next: GymRole) => {
    primeLennySpeechFromUserGesture();
    setRole(next);
    setFamilyPhase(next === "family" ? "simPicker" : "lookup");
    setActiveRequest(null);
    setApprovedName(null);
    setSavedFamilyCode(null);
    setActiveTeacher(null);
  };

  const handleDeskSubmitted = useCallback(
    (request: GymCheckInRequest, shortCode: string) => {
      setLastDeskCode(shortCode);
      setLastDeskFamily(request.familyName);
    },
    [],
  );

  const enterPostApproval = useCallback((request: GymCheckInRequest) => {
    setActiveRequest(request);
    setApprovedName(request.familyName);
    setSavedFamilyCode(request.familyCode);
    setFamilyPhase(postApprovalPhase(request));
  }, []);

  const handleFamilyLinked = (request: GymCheckInRequest) => {
    setActiveRequest(request);
    if (request.status === "pending") {
      setFamilyPhase("waiting");
    } else if (request.status === "approved") {
      enterPostApproval(request);
    } else {
      setFamilyPhase("deniedStory");
    }
  };

  const handleApproved = useCallback(
    (request: GymCheckInRequest) => {
      enterPostApproval(request);
    },
    [enterPostApproval],
  );

  const handleDenied = useCallback(() => {
    setFamilyPhase("deniedStory");
  }, []);

  const handleFamilyCodeSaved = useCallback((familyCode: string) => {
    setSavedFamilyCode(familyCode);
    setActiveRequest((prev) =>
      prev ? { ...prev, familyCode } : prev,
    );
    setFamilyPhase("approved");
  }, []);

  const resetFamily = () => {
    setFamilyPhase("simPicker");
    setActiveRequest(null);
    setApprovedName(null);
    setSavedFamilyCode(null);
  };

  useEffect(() => {
    if (role !== "family" || familyPhase !== "enterFamilyCode" || !activeRequest) {
      return;
    }

    const supabase = createClient();
    const refresh = async () => {
      const row = await getGymCheckIn(supabase, activeRequest.id);
      if (!row) return;
      if (row.familyCode) {
        enterPostApproval(row);
      }
    };

    const interval = window.setInterval(refresh, 2000);
    return () => window.clearInterval(interval);
  }, [role, familyPhase, activeRequest?.id, enterPostApproval]);

  const passNumber =
    activeRequest?.id.replace(/-/g, "").slice(0, 6).toUpperCase() ?? "000000";
  const familyCode =
    savedFamilyCode ?? activeRequest?.familyCode ?? null;

  return (
    <div className="relative w-full max-w-4xl">
      {role === null && <GymRolePicker onPick={pickRole} />}

      {role !== null && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--gym-muted)]">
            Playing as{" "}
            <span className="font-bold uppercase text-[var(--gym-ink)]">
              {role}
              {role === "teacher" && activeTeacher
                ? ` · ${activeTeacher.displayName}`
                : ""}
            </span>
          </p>
          <button type="button" onClick={switchRole} className="gym-btn-ghost">
            Switch role
          </button>
        </div>
      )}

      {role === "owner" && (
        <div className="flex flex-col gap-6">
          <GymOwnerQueue />
          <GymOwnerClasses />
        </div>
      )}

      {role === "teacher" && !activeTeacher && (
        <GymTeacherPicker onSelect={setActiveTeacher} />
      )}

      {role === "teacher" && activeTeacher && (
        <GymTeacherDashboard
          teacher={activeTeacher}
          onQuit={() => setActiveTeacher(null)}
        />
      )}

      {role === "employee" && (
        <div className="flex flex-col gap-6">
          <GymEmployeeDesk onSubmitted={handleDeskSubmitted} />
          {lastDeskCode && lastDeskFamily && (
            <div className="gym-desk-ticket rounded-2xl p-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--gym-accent)]">
                Tell the family
              </p>
              <p className="mt-2 font-[family-name:var(--font-gym-display)] text-3xl font-bold text-[var(--gym-ink)]">
                {lastDeskCode}
              </p>
              <p className="mt-2 text-sm text-[var(--gym-muted)]">
                {lastDeskFamily} — open the{" "}
                <strong>Family</strong> tab and enter this code.
              </p>
            </div>
          )}
        </div>
      )}

      {role === "family" && familyPhase === "simPicker" && (
        <GymFamilySimulatorPicker
          onSelectFamily={handleFamilyLinked}
          onNewCheckIn={() => setFamilyPhase("submit")}
          onLobbyCode={() => setFamilyPhase("lookup")}
        />
      )}

      {role === "family" && familyPhase === "lookup" && (
        <GymFamilyLookup
          onLinked={handleFamilyLinked}
          onNewFamily={() => setFamilyPhase("submit")}
        />
      )}

      {role === "family" && familyPhase === "submit" && (
        <GymCheckInForm
          title="New family check-in"
          description="Tell the owner who you are. Butt Face will pretend to type this into a very old computer."
          submitLabel="Send to the owner"
          onSubmitted={(request) => {
            setActiveRequest(request);
            setFamilyPhase("waiting");
          }}
          footer={
            <button
              type="button"
              onClick={() => setFamilyPhase("simPicker")}
              className="gym-btn-ghost mt-4 w-full"
            >
              Back to family list
            </button>
          }
        />
      )}

      {role === "family" &&
        familyPhase === "waiting" &&
        activeRequest &&
        activeRequest.status === "pending" && (
          <GymFamilyWaiting
            request={activeRequest}
            onApproved={handleApproved}
            onDenied={handleDenied}
          />
        )}

      {role === "family" &&
        familyPhase === "enterFamilyCode" &&
        activeRequest && (
          <GymFamilyCodeForm
            requestId={activeRequest.id}
            familyName={activeRequest.familyName}
            onSaved={handleFamilyCodeSaved}
          />
        )}

      {role === "family" &&
        familyPhase === "approved" &&
        approvedName &&
        familyCode &&
        activeRequest && (
          <GymApprovedScreen
            requestId={activeRequest.id}
            familyName={approvedName}
            familyCode={familyCode}
            passNumber={passNumber}
            lobbyCode={activeRequest?.lobbyCode}
            children={activeRequest?.children ?? []}
            onChildrenUpdated={(children) =>
              setActiveRequest((prev) => (prev ? { ...prev, children } : prev))
            }
            onDone={resetFamily}
          />
        )}

      {role === "family" && familyPhase === "deniedStory" && (
        <GymDenialStory
          familyName={activeRequest?.familyName ?? "Your family"}
          onDone={resetFamily}
        />
      )}
    </div>
  );
}
