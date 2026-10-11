import { Boxes, ChefHat, House } from "lucide-react";

export type AppSection = "home" | "estoque" | "receitas";

const sections: { id: AppSection; label: string; icon: typeof Boxes }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "estoque", label: "Estoque", icon: Boxes },
  { id: "receitas", label: "Receitas", icon: ChefHat },
];

export function AppNavigation({
  activeSection,
  onNavigate,
}: {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
}) {
  const items = sections.map(({ id, label, icon: Icon }) => (
    <button
      key={id}
      type="button"
      aria-current={activeSection === id ? "page" : undefined}
      onClick={() => onNavigate(id)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        activeSection === id
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  ));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Boxes className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-sm font-bold">Controle de Produção</p>
            <p className="text-xs text-muted-foreground">Painel de gestão</p>
          </div>
        </div>
        <nav aria-label="Menu principal" className="space-y-1">
          {items}
        </nav>
      </aside>

      <nav
        aria-label="Menu principal"
        className="sticky top-0 z-20 flex gap-2 border-b bg-card/95 p-3 backdrop-blur md:hidden"
      >
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={activeSection === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
