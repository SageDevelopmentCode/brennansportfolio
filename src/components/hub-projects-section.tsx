"use client";

import { ProjectCard } from "@/components/project-card";
import type {
  BookPreview,
  HomeworkPreview,
  LibraryPreview,
  OverlookPreview,
  Project,
  SkylinePreview,
} from "@/lib/projects";
import { useState } from "react";

type HubTab = "brennan" | "jonathan";

const TABS: { id: HubTab; label: string }[] = [
  { id: "brennan", label: "Brennan's Projects" },
  { id: "jonathan", label: "Jonathan's Projects" },
];

type HubProjectsSectionProps = {
  mainProjects: Project[];
  jonathanProjects: Project[];
  overlookPreview: OverlookPreview;
  bookPreview: BookPreview;
  libraryPreview: LibraryPreview;
  skylinePreview: SkylinePreview;
  homeworkPreview: HomeworkPreview | null;
};

export function HubProjectsSection({
  mainProjects,
  jonathanProjects,
  overlookPreview,
  bookPreview,
  libraryPreview,
  skylinePreview,
  homeworkPreview,
}: HubProjectsSectionProps) {
  const [activeTab, setActiveTab] = useState<HubTab>("brennan");

  const visibleProjects =
    activeTab === "brennan" ? mainProjects : jonathanProjects;

  return (
    <section className="w-full">
      <p className="mb-6 text-center text-sm font-bold uppercase tracking-[0.3em] text-white/40 sm:text-left">
        Choose your world
      </p>

      <div
        className="mb-8 flex flex-wrap justify-center gap-2 sm:justify-start"
        role="tablist"
        aria-label="Project collections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.id
                ? "border-white/40 bg-white/20 text-white shadow-lg backdrop-blur-sm"
                : "border-white/20 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
      >
        {visibleProjects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={index}
            overlookPreview={
              project.id === "overlook" ? overlookPreview : undefined
            }
            bookPreview={project.id === "books" ? bookPreview : undefined}
            libraryPreview={
              project.id === "library" ? libraryPreview : undefined
            }
            skylinePreview={
              project.id === "skyline" ? skylinePreview : undefined
            }
            homeworkPreview={
              project.id === "homework" ? homeworkPreview ?? undefined : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
