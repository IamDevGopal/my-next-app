"use client";

import { CheckCircle2, ShieldCheck, UserRound, UsersRound } from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

import { listTeams } from "@/features/teams/api/teams.api";
import type { TeamSummaryData } from "@/features/teams/types/team.type";
import { getErrorMessage } from "@/lib/http/get-error-message";
import type { ScopeView } from "../types/task-workspace.type";
import { TaskCollection } from "./task-collection";
import { ToggleButton, InlineSelect } from "./task-controls";
import { formatEnum } from "../helpers/task-display.helper";

interface TasksWorkspaceProps {
  accessToken: string;
  currentUserId: string;
}

interface TeamTasksPanelProps {
  accessToken: string;
  currentUserId: string;
  teamId: string;
  teamName: string;
  currentUserRole: TeamSummaryData["currentUserRole"] | null;
}

export function TasksWorkspace({
  accessToken,
  currentUserId,
}: TasksWorkspaceProps) {
  const [teams, setTeams] = useState<TeamSummaryData[]>([]);
  const [teamsMessage, setTeamsMessage] = useState<string | null>(null);
  const [isTeamsLoading, setIsTeamsLoading] = useState(true);
  const [activeView, setActiveView] = useState<ScopeView>("personal");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [nextTeamsCursor, setNextTeamsCursor] = useState<string | null>(null);
  const teamsRequestScope = useRef(0);

  useEffect(() => {
    const scopeId = ++teamsRequestScope.current;
    let isCurrent = true;

    async function loadWorkspaceTeams() {
      setIsTeamsLoading(true);
      setTeamsMessage(null);
      setNextTeamsCursor(null);

      try {
        const response = await listTeams(accessToken, { limit: 50 });
        if (!isCurrent) return;
        setTeams(response.data.teams);
        setSelectedTeamId((current) =>
          response.data.teams.some((team) => team.id === current)
            ? current
            : response.data.teams[0]?.id || "",
        );
        setNextTeamsCursor(
          response.data.pageInfo.hasNextPage
            ? response.data.pageInfo.nextCursor
            : null,
        );
      } catch (error) {
        if (!isCurrent) return;
        setTeamsMessage(getErrorMessage(error));
      } finally {
        if (isCurrent) setIsTeamsLoading(false);
      }
    }

    void loadWorkspaceTeams();

    return () => {
      isCurrent = false;
      if (teamsRequestScope.current === scopeId) teamsRequestScope.current += 1;
    };
  }, [accessToken]);

  async function loadMoreTeams() {
    if (!nextTeamsCursor || isTeamsLoading) return;
    const scopeId = teamsRequestScope.current;
    setIsTeamsLoading(true);
    setTeamsMessage(null);
    try {
      const response = await listTeams(accessToken, {
        limit: 50,
        cursor: nextTeamsCursor,
      });
      if (scopeId !== teamsRequestScope.current) return;
      setTeams((current) => [
        ...current,
        ...response.data.teams.filter(
          (team) => !current.some((existing) => existing.id === team.id),
        ),
      ]);
      setNextTeamsCursor(
        response.data.pageInfo.hasNextPage
          ? response.data.pageInfo.nextCursor
          : null,
      );
    } catch (error) {
      if (scopeId === teamsRequestScope.current)
        setTeamsMessage(getErrorMessage(error));
    } finally {
      if (scopeId === teamsRequestScope.current) setIsTeamsLoading(false);
    }
  }

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-3 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" />
              Tasks
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Work tracker
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create, update, and review personal or team work without leaving
              the dashboard.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <ToggleButton
              active={activeView === "personal"}
              icon={<UserRound className="size-4" />}
              label="Personal"
              onClick={() => setActiveView("personal")}
            />
            <ToggleButton
              active={activeView === "team"}
              icon={<ShieldCheck className="size-4" />}
              label="Team"
              onClick={() => setActiveView("team")}
            />
            <ToggleButton
              active={activeView === "shared"}
              icon={<UsersRound className="size-4" />}
              label="Shared with me"
              onClick={() => setActiveView("shared")}
            />
          </div>
        </div>

        {activeView === "team" ? (
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-slate-600">
                Pick a team workspace to manage shared tasks under team
                permissions.
              </p>
            </div>

            <InlineSelect
              disabled={isTeamsLoading || teams.length === 0}
              label="Team workspace"
              onChange={setSelectedTeamId}
              options={
                teams.length === 0
                  ? [isTeamsLoading ? "Loading teams" : "No teams yet"]
                  : teams.map((team) => team.id)
              }
              optionLabels={
                teams.length === 0
                  ? {}
                  : Object.fromEntries(
                      teams.map((team) => [
                        team.id,
                        `${team.name} / ${formatEnum(team.currentUserRole ?? "VIEWER")}`,
                      ]),
                    )
              }
              value={selectedTeamId}
              wrapperClassName="w-full max-w-sm"
            />
            {nextTeamsCursor ? (
              <button
                type="button"
                disabled={isTeamsLoading}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                onClick={() => void loadMoreTeams()}
              >
                Load more teams
              </button>
            ) : null}
          </div>
        ) : null}

        {teamsMessage ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {teamsMessage}
          </div>
        ) : null}
      </div>

      <div className="p-3 sm:p-5">
        {activeView === "personal" ? (
          <TaskCollection
            accessToken={accessToken}
            currentUserId={currentUserId}
            heading="Personal tasks"
            key={currentUserId + ":personal"}
            scope="PERSONAL"
            subheading="Track your own work, deadlines and progress."
          />
        ) : activeView === "shared" ? (
          <TaskCollection
            accessToken={accessToken}
            currentUserId={currentUserId}
            key={currentUserId + ":shared"}
            heading="Shared with me"
            scope="SHARED"
            subheading="Tasks shared directly with you. Editing follows your task permissions."
          />
        ) : (
          <TaskCollection
            accessToken={accessToken}
            currentUserId={currentUserId}
            heading={selectedTeam ? `${selectedTeam.name} tasks` : "Team tasks"}
            key={currentUserId + ":team:" + (selectedTeam?.id ?? "")}
            scope="TEAM"
            subheading="Shared task progress lives under the selected team's membership rules."
            team={
              selectedTeam
                ? {
                    id: selectedTeam.id,
                    name: selectedTeam.name,
                    role: selectedTeam.currentUserRole,
                  }
                : null
            }
          />
        )}
      </div>
    </section>
  );
}

export function TeamTasksPanel({
  accessToken,
  currentUserId,
  teamId,
  teamName,
  currentUserRole,
}: TeamTasksPanelProps) {
  return (
    <TaskCollection
      accessToken={accessToken}
      currentUserId={currentUserId}
      compact
      key={currentUserId + ":" + teamId}
      heading="Team tasks"
      scope="TEAM"
      subheading="Review your team's tasks and responsibilities."
      team={{ id: teamId, name: teamName, role: currentUserRole }}
    />
  );
}
