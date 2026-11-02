"use client";

import { GymCheckInForm } from "@/components/gym-check-in-form";
import type { GymCheckInRequest } from "@/lib/gym";

type GymEmployeeDeskProps = {
  onSubmitted: (request: GymCheckInRequest, shortCode: string) => void;
};

export function GymEmployeeDesk({ onSubmitted }: GymEmployeeDeskProps) {
  return (
    <GymCheckInForm
      title="Front desk check-in"
      description="Families ask if they're allowed to use the gym. Send the request to the owner."
      submitLabel="Ask the owner"
      onSubmitted={(request) => {
        if (!request.lobbyCode) return;
        onSubmitted(request, request.lobbyCode);
      }}
    />
  );
}
