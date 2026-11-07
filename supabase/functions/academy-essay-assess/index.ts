/** VYZO ACADEMY — B1. Deploy somente após Auth e consentimento de custos.
 * Necessita verify_jwt=true e ACADEMY_AI_ENABLED=true + ACADEMY_AI_ESSAY_ENABLED=true.
 * As duas flags e a credencial OPENAI_API_KEY ficam apenas no servidor.
 */
import {handleEssayAssessment} from './gateway.mjs';
Deno.serve(handleEssayAssessment);
