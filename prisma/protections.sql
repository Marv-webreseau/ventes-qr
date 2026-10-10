-- Protections que Prisma ne sait pas exprimer. Idempotent : peut être relancé.
-- Appliquer avec : npm run db:protections

-- 1. Le journal des mouvements ne peut ni être modifié ni être supprimé.
CREATE OR REPLACE FUNCTION interdire_modification() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La table % est en ajout seul : modification et suppression interdites.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mouvement_ajout_seul ON "Mouvement";
CREATE TRIGGER mouvement_ajout_seul BEFORE UPDATE OR DELETE ON "Mouvement"
  FOR EACH ROW EXECUTE FUNCTION interdire_modification();

-- 2. Un article ne peut avoir qu'une seule vente valide (dernier filet anti double vente).
CREATE UNIQUE INDEX IF NOT EXISTS vente_une_valide_par_article ON "Vente" ("articleId") WHERE statut = 'VALIDE';

-- 3. Montants cohérents.
ALTER TABLE "Vente" DROP CONSTRAINT IF EXISTS vente_montants_positifs;
ALTER TABLE "Vente" ADD CONSTRAINT vente_montants_positifs CHECK (montant > 0 AND "prixCatalogue" > 0);
ALTER TABLE "Produit" DROP CONSTRAINT IF EXISTS produit_prix_positif;
ALTER TABLE "Produit" ADD CONSTRAINT produit_prix_positif CHECK (prix > 0);

-- 4. Le journal des comptes est lui aussi en ajout seul.
DROP TRIGGER IF EXISTS journal_compte_ajout_seul ON "JournalCompte";
CREATE TRIGGER journal_compte_ajout_seul BEFORE UPDATE OR DELETE ON "JournalCompte"
  FOR EACH ROW EXECUTE FUNCTION interdire_modification();
