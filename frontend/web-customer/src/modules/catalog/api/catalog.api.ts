import { createCatalogApi } from '../../../../../shared/catalog';
import { appConfig } from '../../../configs/app.config';
import { requestApi } from '../../../services/api-client';
export const catalogApi = createCatalogApi(requestApi, appConfig.catalogSource);
