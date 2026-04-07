import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Bell, Settings, Moon, Sun } from "lucide-react";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { RiskChart } from "@/components/dashboard/RiskChart";
import { ProjectTable } from "@/components/dashboard/ProjectTable";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { ProjectInputForm } from "@/components/dashboard/ProjectInputForm";
import { createProject, initialProjects, type NewProjectInput, type Project } from "@/components/dashboard/dashboard-data";

const Index = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [theme, setTheme] = useState<"dark" | "soothing">("dark");

  const handleAddProject = (project: NewProjectInput) => {
    setProjects((prev) => {
      const nextId = `PRJ-${String(prev.length + 1).padStart(3, "0")}`;
      return [createProject(nextId, project), ...prev];
    });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "soothing" : "dark");
  };

  return (
    <div className={`min-h-screen bg-background grid-pattern transition-colors duration-500 ${theme === "soothing" ? "soothing" : ""}`}>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md transition-colors duration-500">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 glow-primary transition-colors">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold tracking-wide text-foreground">SENTINEL</h1>
              <p className="text-[10px] text-muted-foreground">AI Risk Monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="group relative flex h-9 items-center gap-2 overflow-hidden rounded-full bg-secondary/50 px-4 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground border border-border"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  {theme === "dark" ? (
                    <>
                      <Moon className="h-3.5 w-3.5" />
                      <span>Night Mode</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-3.5 w-3.5" />
                      <span>Soothing Mode</span>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
            
            <div className="mx-2 h-4 w-[1px] bg-border" />

            <button className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
            </button>
            <button className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Settings className="h-4 w-4" />
            </button>
            <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground transition-colors">
              SC
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-lg font-semibold text-foreground">Dashboard Overview</h2>
          <p className="text-sm text-muted-foreground">Backend-style live analysis for project risk input</p>
        </motion.div>

        <div className="mb-6">
          <StatsBar projects={projects} />
        </div>

        <div className="mb-6">
          <ProjectInputForm onAddProject={handleAddProject} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <RiskChart projects={projects} />
            <ProjectTable projects={projects} />
          </div>
          <div className="h-[calc(100vh-280px)] min-h-[500px] lg:sticky lg:top-20">
            <ChatPanel projects={projects} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
