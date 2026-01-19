import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeptideReconstitutionCalculatorEmbed } from "@/components/embeds/PeptideReconstitutionCalculatorEmbed";
import { OilMlCalculatorEmbed } from "@/components/embeds/OilMlCalculatorEmbed";

/**
 * Landing-page friendly wrapper: one embed that contains both calculators.
 * If you prefer separate sections, you can import the two calculator components directly.
 */
export function CalculatorEmbedTabs() {
  return (
    <Tabs defaultValue="peptide" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="peptide">Peptides</TabsTrigger>
        <TabsTrigger value="oil">Oil-based</TabsTrigger>
      </TabsList>

      <TabsContent value="peptide" className="mt-4">
        <PeptideReconstitutionCalculatorEmbed />
      </TabsContent>

      <TabsContent value="oil" className="mt-4">
        <OilMlCalculatorEmbed />
      </TabsContent>
    </Tabs>
  );
}
