import { createCatalogApi } from './catalog.factory';
import { appConfig } from '../../../configs/app.config';
import { requestApi } from '../../../lib/axios/api-client';
export const catalogApi = createCatalogApi(requestApi, appConfig.catalogSource);
