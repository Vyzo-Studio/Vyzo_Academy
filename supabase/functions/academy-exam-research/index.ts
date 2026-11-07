/** V16.2 — serviço oficial de pesquisa, desabilitado até homologação.
 * Deploy conjunto com a migração V16.2 de RPC restrita a service_role.
 * Exige verify_jwt=true; nenhum segredo pode entrar na distribuição web.
 */
import {handleResearchRequest} from './gateway.mjs';
Deno.serve(handleResearchRequest);
