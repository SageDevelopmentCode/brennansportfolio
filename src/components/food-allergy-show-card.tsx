"use client";

import type { AllergyCardContent } from "@/lib/food-allergies";
import { useCallback, useEffect, useRef, useState } from "react";

type FoodAllergyShowCardProps = {
  content: AllergyCardContent;
  onGoManage?: () => void;
  onGoSetup?: () => void;
};

export function FoodAllergyShowCard({
  content,
  onGoManage,
  onGoSetup,
}: FoodAllergyShowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onChange = () => setFullscreen(document.fullscreenElement === el);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [content.isEmpty]);

  if (content.isEmpty) {
    return (
      <div className="allergies-glass-card rounded-3xl p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold text-[var(--allergies-ink)]">My allergy card</h2>
        <p className="mt-3 text-[var(--allergies-muted)]">
          Add your allergens and foods to avoid first — then you can show or print a card for
          others.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {onGoSetup && (
            <button type="button" onClick={onGoSetup} className="allergies-btn-primary">
              Set up my plate
            </button>
          )}
          {onGoManage && (
            <button type="button" onClick={onGoManage} className="allergies-btn-secondary">
              Go to Manage
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="allergies-no-print flex flex-wrap gap-3">
        <button type="button" onClick={() => window.print()} className="allergies-btn-primary">
          Print card
        </button>
        <button type="button" onClick={toggleFullscreen} className="allergies-btn-secondary">
          {fullscreen ? "Exit fullscreen" : "Show fullscreen"}
        </button>
      </div>

      <div
        ref={cardRef}
        id="allergy-show-card-print"
        className="allergies-show-card"
      >
        <p className="allergies-show-card-alert">Food allergy alert</p>

        {content.displayName && (
          <p className="allergies-show-card-name">My name is {content.displayName}</p>
        )}

        <p className="allergies-show-card-lead">
          I have food allergies. Please do not give me:
        </p>

        {content.allergens.length > 0 && (
          <section className="allergies-show-card-section">
            <h2 className="allergies-show-card-heading">Allergic to</h2>
            <ul className="allergies-show-card-allergen-list">
              {content.allergens.map((a) => (
                <li key={a.id} className="allergies-show-card-allergen-item">
                  <span aria-hidden>{a.emoji}</span> {a.label}
                </li>
              ))}
            </ul>
          </section>
        )}

        {content.avoidFoods.length > 0 && (
          <section className="allergies-show-card-section allergies-show-card-avoid">
            <h2 className="allergies-show-card-heading">Do not serve me</h2>
            <ul className="allergies-show-card-food-list">
              {content.avoidFoods.map((food) => (
                <li key={food.id}>
                  <span aria-hidden>{food.emoji}</span> {food.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="allergies-show-card-footer">
          Please check ingredients and cross-contact before serving. Ask a grown-up if you are not
          sure. Thank you for keeping me safe.
        </p>
      </div>
    </div>
  );
}
