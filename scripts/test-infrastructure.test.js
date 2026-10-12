/**
 * ==============================================================================
 * Project Nexus - Comprehensive Infrastructure & Microservices Test Suite
 * Validates Dockerfiles, Kubernetes manifests, GitOps ArgoCD, GitLab CI/CD,
 * and live HTTP healthcheck probes across all 7 backend microservices.
 * Built using Node.js native test runner (node:test).
 * ==============================================================================
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const ROOT_DIR = path.resolve(__dirname, '..');

const SERVICES = [
  { name: 'api-gateway', port: 4000, context: 'API Gateway' },
  { name: 'user-service', port: 4001, context: 'User & Authentication' },
  { name: 'catalog-service', port: 4002, context: 'Product Catalog' },
  { name: 'commerce-service', port: 4003, context: 'Commerce & Orders' },
  { name: 'auction-service', port: 4004, context: 'Real-Time Auction & Bidding' },
  { name: 'fulfillment-service', port: 4005, context: 'Fulfillment & Shipping' },
  { name: 'notification-service', port: 4006, context: 'Notification & Alerts' },
];

describe('1. Microservices Application Instances & Healthcheck Probes', () => {
  for (const svc of SERVICES) {
    test(`[${svc.name}] creates Express app and responds HTTP 200 on /health`, async () => {
      const appPath = path.join(ROOT_DIR, 'backend', svc.name, 'dist', 'app.js');
      assert.ok(fs.existsSync(appPath), `Compiled app file must exist: ${appPath}`);

      const { createApplication } = require(appPath);
      assert.strictEqual(
        typeof createApplication,
        'function',
        `createApplication must be exported by ${svc.name}`,
      );

      const app = createApplication();
      const server = http.createServer(app);

      await new Promise((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => resolve());
        server.on('error', reject);
      });

      try {
        const address = server.address();
        const testPort = address.port;

        const responseData = await new Promise((resolve, reject) => {
          http
            .get(`http://127.0.0.1:${testPort}/health`, (res) => {
              let data = '';
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => {
                resolve({
                  statusCode: res.statusCode,
                  headers: res.headers,
                  body: JSON.parse(data),
                });
              });
            })
            .on('error', reject);
        });

        assert.strictEqual(
          responseData.statusCode,
          200,
          `Expected HTTP 200 from ${svc.name}/health`,
        );
        assert.strictEqual(
          responseData.body.status,
          'UP',
          `Expected status: "UP" from ${svc.name}`,
        );
        if (svc.name === 'api-gateway') {
          assert.strictEqual(responseData.body.gateway, 'api-gateway');
          assert.ok(responseData.body.services, 'Gateway must return registered services list');
        } else {
          assert.strictEqual(responseData.body.service, svc.name);
          assert.ok(responseData.body.boundedContext, 'Service must state its bounded context');
        }
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });
  }
});

describe('2. Dockerfile Configurations & Hardening Standards', () => {
  test('Root parameterized Dockerfile exists and satisfies security & size constraints', () => {
    const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile');
    assert.ok(fs.existsSync(dockerfilePath), 'Root Dockerfile must exist');
    const content = fs.readFileSync(dockerfilePath, 'utf-8');

    assert.ok(
      content.includes('FROM node:20-alpine AS base'),
      'Base stage must use node:20-alpine',
    );
    assert.ok(content.includes('FROM base AS builder'), 'Builder stage must derive from base');
    assert.ok(
      content.includes('FROM node:20-alpine AS runner'),
      'Runner stage must use node:20-alpine',
    );
    assert.ok(content.includes('USER node'), 'Container must run as non-root USER node');
    assert.ok(
      content.includes('rm -rf /prod/app/src'),
      'Production bundle must strip source files',
    );
    assert.ok(
      content.includes("require('http').get('http://127.0.0.1:"),
      'Healthcheck must probe 127.0.0.1',
    );
    assert.ok(content.includes(".on('error',"), 'Healthcheck must handle ECONNREFUSED cleanly');
  });

  for (const svc of SERVICES) {
    test(`[backend/${svc.name}/Dockerfile] satisfies microservice production standards`, () => {
      const dockerfilePath = path.join(ROOT_DIR, 'backend', svc.name, 'Dockerfile');
      assert.ok(fs.existsSync(dockerfilePath), `backend/${svc.name}/Dockerfile must exist`);
      const content = fs.readFileSync(dockerfilePath, 'utf-8');

      assert.ok(content.includes('FROM node:20-alpine AS base'), 'Must use node:20-alpine base');
      assert.ok(content.includes('USER node'), 'Must enforce non-root USER node');
      assert.ok(content.includes(`EXPOSE ${svc.port}`), `Must expose correct port ${svc.port}`);
      assert.ok(content.includes(`ENV PORT=${svc.port}`), `Must define default PORT=${svc.port}`);
      assert.ok(
        content.includes('rm -rf /prod/app/src'),
        'Must strip TypeScript source files from prod bundle',
      );
      assert.ok(
        content.includes("require('http').get('http://127.0.0.1:"),
        'Healthcheck must use 127.0.0.1',
      );
      assert.ok(content.includes(".on('error',"), 'Healthcheck must handle socket errors cleanly');
    });
  }

  test('.dockerignore excludes sensitive files and nested caches recursively', () => {
    const dockerignorePath = path.join(ROOT_DIR, '.dockerignore');
    assert.ok(fs.existsSync(dockerignorePath), '.dockerignore must exist');
    const content = fs.readFileSync(dockerignorePath, 'utf-8');

    assert.ok(content.includes('**/node_modules'), 'Must recursively ignore node_modules');
    assert.ok(content.includes('**/.pnpm-store'), 'Must recursively ignore .pnpm-store');
    assert.ok(content.includes('**/dist'), 'Must recursively ignore dist');
    assert.ok(content.includes('.env'), 'Must ignore .env');
    assert.ok(content.includes('!.env.example'), 'Must permit .env.example');
  });
});

describe('3. Kubernetes Manifests & GitOps Production Integrity', () => {
  const k8sDir = path.join(ROOT_DIR, 'devops', 'k8s');

  test('kustomization.yaml includes namespace, configs, secrets, ingress and all 7 services', () => {
    const kustomizePath = path.join(k8sDir, 'kustomization.yaml');
    assert.ok(fs.existsSync(kustomizePath), 'kustomization.yaml must exist');
    const content = fs.readFileSync(kustomizePath, 'utf-8');

    assert.ok(content.includes('namespace: nexus'), 'Namespace must be set to nexus');
    assert.ok(content.includes('namespace.yaml'), 'Must include namespace.yaml');
    assert.ok(content.includes('configmap.yaml'), 'Must include configmap.yaml');
    assert.ok(content.includes('secret.yaml'), 'Must include secret.yaml');
    assert.ok(content.includes('ingress.yaml'), 'Must include ingress.yaml');

    for (const svc of SERVICES) {
      assert.ok(
        content.includes(`${svc.name}.yaml`),
        `kustomization.yaml must include ${svc.name}.yaml`,
      );
    }
  });

  test('secret.yaml includes database connections and gitlab-registry-secret', () => {
    const secretPath = path.join(k8sDir, 'secret.yaml');
    assert.ok(fs.existsSync(secretPath), 'secret.yaml must exist');
    const content = fs.readFileSync(secretPath, 'utf-8');

    assert.ok(content.includes('name: nexus-secret'), 'Must define nexus-secret');
    assert.ok(content.includes('USER_DB_URL'), 'Must define USER_DB_URL');
    assert.ok(content.includes('AUCTION_DB_URL'), 'Must define AUCTION_DB_URL');
    assert.ok(
      content.includes('name: gitlab-registry-secret'),
      'Must define gitlab-registry-secret',
    );
    assert.ok(
      content.includes('type: kubernetes.io/dockerconfigjson'),
      'Registry secret must have dockerconfigjson type',
    );
  });

  test('configmap.yaml defines CoreDNS URLs and port mappings for all 7 services', () => {
    const configPath = path.join(k8sDir, 'configmap.yaml');
    assert.ok(fs.existsSync(configPath), 'configmap.yaml must exist');
    const content = fs.readFileSync(configPath, 'utf-8');

    for (const svc of SERVICES) {
      if (svc.name !== 'api-gateway') {
        const urlKey = `${svc.name.replace('-service', '').toUpperCase()}_SERVICE_URL`;
        assert.ok(content.includes(urlKey), `ConfigMap must define discovery URL key: ${urlKey}`);
        assert.ok(
          content.includes(`http://${svc.name}:${svc.port}`),
          `CoreDNS URL must map to http://${svc.name}:${svc.port}`,
        );
      }
    }
  });

  for (const svc of SERVICES) {
    test(`[devops/k8s/${svc.name}.yaml] defines robust Deployment and Service`, () => {
      const manifestPath = path.join(k8sDir, `${svc.name}.yaml`);
      assert.ok(fs.existsSync(manifestPath), `${svc.name}.yaml must exist`);
      const content = fs.readFileSync(manifestPath, 'utf-8');

      // Deployment checks
      assert.ok(content.includes(`name: ${svc.name}`), `Deployment must be named ${svc.name}`);
      assert.ok(content.includes('namespace: nexus'), 'Namespace must be nexus');
      assert.ok(
        content.includes(
          `image: git.fsoft-academy.edu.vn:5050/nexus/nexus-ecommerce/${svc.name}:latest`,
        ),
        'Image must match GitLab Registry specification',
      );
      assert.ok(content.includes('imagePullSecrets:'), 'Must specify imagePullSecrets');
      assert.ok(
        content.includes('gitlab-registry-secret'),
        'Must reference gitlab-registry-secret',
      );
      assert.ok(content.includes('runAsNonRoot: true'), 'Must enforce runAsNonRoot');
      assert.ok(content.includes('runAsUser: 1000'), 'Must enforce non-root UID 1000');
      assert.ok(
        content.includes(`containerPort: ${svc.port}`),
        `containerPort must be ${svc.port}`,
      );
      assert.ok(content.includes('livenessProbe:'), 'Must configure livenessProbe');
      assert.ok(content.includes('readinessProbe:'), 'Must configure readinessProbe');
      assert.ok(content.includes('path: /health'), 'Probes must target /health');
      assert.ok(content.includes('resources:'), 'Must configure resource requests and limits');

      // Service checks
      assert.ok(content.includes('kind: Service'), 'Must define Service resource');
      assert.ok(content.includes(`port: ${svc.port}`), `Service port must be ${svc.port}`);
      assert.ok(
        content.includes(`app: ${svc.name}`),
        `Service selector must match app: ${svc.name}`,
      );
    });
  }

  test('ingress.yaml routes traffic to api-gateway on port 4000', () => {
    const ingressPath = path.join(k8sDir, 'ingress.yaml');
    assert.ok(fs.existsSync(ingressPath), 'ingress.yaml must exist');
    const content = fs.readFileSync(ingressPath, 'utf-8');

    assert.ok(content.includes('kind: Ingress'), 'Must define Ingress resource');
    assert.ok(content.includes('name: api-gateway'), 'Must route to api-gateway service');
    assert.ok(content.includes('number: 4000'), 'Must target port 4000');
  });

  test('devops/argocd/application.yaml is configured for automated sync, prune, and selfHeal', () => {
    const argocdPath = path.join(ROOT_DIR, 'devops', 'argocd', 'application.yaml');
    assert.ok(fs.existsSync(argocdPath), 'devops/argocd/application.yaml must exist');
    const content = fs.readFileSync(argocdPath, 'utf-8');

    assert.ok(content.includes('kind: Application'), 'Must define Application CRD');
    assert.ok(
      content.includes('repoURL: https://git.fsoft-academy.edu.vn/nexus/nexus-ecommerce.git'),
      'repoURL must match project git URL',
    );
    assert.ok(content.includes('path: devops/k8s'), 'path must point to devops/k8s');
    assert.ok(content.includes('prune: true'), 'GitOps must have prune: true');
    assert.ok(content.includes('selfHeal: true'), 'GitOps must have selfHeal: true');
  });
});

describe('4. GitLab CI/CD Pipeline Configuration', () => {
  test('.gitlab-ci.yml configures parallel container build and publish on main and develop', () => {
    const ciPath = path.join(ROOT_DIR, '.gitlab-ci.yml');
    assert.ok(fs.existsSync(ciPath), '.gitlab-ci.yml must exist');
    const content = fs.readFileSync(ciPath, 'utf-8');

    assert.ok(content.includes('stage: docker-build'), 'Must define docker-build stage');
    assert.ok(content.includes('docker_build_and_push:'), 'Must define docker_build_and_push job');
    assert.ok(
      content.includes('DOCKER_HOST: tcp://docker:2376'),
      'Must configure DOCKER_HOST for Docker-in-Docker networking',
    );
    assert.ok(
      content.includes("DOCKER_TLS_CERTDIR: '/certs'"),
      'Must configure DOCKER_TLS_CERTDIR',
    );
    assert.ok(content.includes("DOCKER_TLS_VERIFY: '1'"), 'Must configure DOCKER_TLS_VERIFY');
    assert.ok(
      content.includes('docker login -u "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"'),
      'Must authenticate using GitLab CI registry variables',
    );
    assert.ok(content.includes('$CI_COMMIT_BRANCH == "main"'), 'Must trigger on main branch');
    assert.ok(content.includes('$CI_COMMIT_BRANCH == "develop"'), 'Must trigger on develop branch');

    for (const svc of SERVICES) {
      assert.ok(content.includes(`- ${svc.name}`), `Matrix must build ${svc.name}`);
    }
  });
});
