export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  rabbitAdminApiUrl: 'http://localhost:8082',
  azure: {
    clientId: '889d23a5-8665-4e52-8541-02dfba7e2786',
    tenantId: 'bb5324af-c266-41ed-b36c-a971641c7af2',
    authority: 'https://login.microsoftonline.com/bb5324af-c266-41ed-b36c-a971641c7af2',
    redirectUri: 'http://localhost:4200',
    protectedResourceScopes: ['api://979b7949-f63b-4e7c-baa8-e382982acee6/OT.Create']
  }
};
