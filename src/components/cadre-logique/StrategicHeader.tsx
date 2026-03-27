import { Shield, Target, Award } from "lucide-react";

const StrategicHeader = () => (
  <div className="rounded-lg bg-primary p-6 text-primary-foreground">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
        <Shield className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">
          Sous-programme 3 : Fourniture des services aéronautiques
        </h2>
        <div className="flex items-center gap-2 text-primary-foreground/80">
          <Target className="h-4 w-4" />
          <p className="text-sm font-medium">
            Action 302 : Accroissement des formations et développement des
            compétences de l'industrie
          </p>
        </div>
        <div className="flex items-center gap-2 text-primary-foreground/60">
          <Award className="h-4 w-4" />
          <p className="text-xs">
            Cadre logique de performance — Plan Triennal 2025–2027
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default StrategicHeader;
