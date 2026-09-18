export const environment = {
  production: false,

  // La URL de tu backend corriendo de forma local
  apiBaseUrl: 'http://localhost:8080',

  azure: {
    // Coincide con spring.cloud.azure.active-directory.credential.client-id
    clientId: '979b7949-f63b-4e7c-baa8-e382982acee6',

    // Es la URL de Microsoft + spring.cloud.azure.active-directory.profile.tenant-id
    authority: '[https://login.microsoftonline.com/common]' +
      '(https://login.microsoftonline.com/common)',

    // La URL de tu Angular local donde Azure redirige tras el login
    redirectUri: 'http://localhost:4200',

    // El app-id-uri de tu backend sumado al permiso específico que pide el controlador (OT.Create)
    protectedResourceScopes: 'api://979b7949-f63b-4e7c-baa8-e382982acee6/OT.Create'
  }
};
