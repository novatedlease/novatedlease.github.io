export type TabDef<T extends string> = { id: T; title: string; desc: string };

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="nlc-tabs" role="tablist" data-tour-id="output-tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          className="nlc-tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
        >
          <div className="nlc-tab__title">{t.title}</div>
          <div className="nlc-tab__desc">{t.desc}</div>
        </button>
      ))}
    </div>
  );
}
