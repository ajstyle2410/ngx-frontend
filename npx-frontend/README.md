# Nexora Project Workspace

Angular frontend for the role-based project dashboard. The screens use the Spring Boot API; there is no local demo dataset or client-side simulated login.

## Requirements

- Node.js LTS and npm
- The Spring Boot API and MySQL database from `../npx-backend`

## Configure the API

Set the backend API origin in [`src/environments/environment.ts`](./src/environments/environment.ts):

```ts
export const environment = {
  apiUrl: 'http://localhost:8080/api',
};
```

For production, change this to the deployed HTTPS API origin. The matching backend `CORS_ORIGIN` must equal the frontend origin.

## Run locally

Start and configure the backend first, then run:

```powershell
npm install
npm start
```

Open `http://localhost:4200`. Sign in with an administrator or a user account created by the administrator. The frontend stores the JWT session in browser local storage and sends it as a Bearer token to the configured API. Role enforcement remains on the backend.

## Validate

```powershell
npm run build
npm test -- --watch=false
```

## Connected workflows

- Login against `/api/auth/login`.
- Live project, user, task, summary, message and notification API requests.
- Admin project and account creation, participant assignment, task assignment and CSV report downloads.
- Developer task status changes and time logs.
- Participant project progress, task status and hours.
- API error and loading states; API requests fail visibly when the backend cannot be reached.
