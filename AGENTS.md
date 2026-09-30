You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.
- Prefer patterns, APIs, imports, examples, and implementation approaches documented in the official Angular documentation.
- When multiple valid approaches exist, prefer the one recommended for the project's current Angular version.
- Do not rely on outdated Angular patterns, deprecated APIs, or third-party conventions when an official Angular solution exists.
- For newly introduced Angular features, verify usage against the current official Angular documentation before implementation.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## Project Architecture

- Organize application code by domain and feature.
- Keep feature-specific UI, models, services, and behavior inside their corresponding feature.
- Use `core` only for application-wide infrastructure, singleton services, guards, interceptors, layouts, and other global concerns.
- Use `shared` only for genuinely reusable and domain-independent UI, utilities, and models.
- Do not use `core` or `shared` as dumping grounds for code without a clear architectural owner.
- Keep clear boundaries between features, application-wide infrastructure, and reusable UI.
- Avoid coupling one feature to implementation details of another feature.
- Keep business and domain logic independent from UI and infrastructure details when practical.
- Introduce additional architectural layers only when they solve a real current problem.

## Code Quality and Design

- Follow SOLID and Clean Code principles pragmatically rather than mechanically.
- Prefer simple, explicit, readable code over clever or unnecessarily abstract solutions.
- Keep functions, components, and services focused on one coherent responsibility.
- Use descriptive names that communicate intent.
- Prefer composition over inheritance.
- Avoid premature abstraction and speculative generalization.
- Extract reusable abstractions when there is a meaningful reusable concept, not merely to remove every instance of duplication.
- Do not create interfaces, wrappers, services, or architectural layers without a concrete reason.
- Comments should explain why something exists when the reason is not obvious; do not restate what the code already expresses clearly.
- Prefer the simplest architecture that satisfies the current requirement while preserving reasonable extensibility.

## Dependencies

- Prefer Angular, TypeScript, browser APIs, Tailwind CSS, and dependencies already present in the project.
- Do not add third-party dependencies unless they provide clear value that cannot reasonably be achieved with the existing stack.
- Consider maintenance, bundle size, security, compatibility, and long-term support before introducing a dependency.
- Do not add, remove, or replace dependencies without explicit approval.

## UI and Responsive Design

- Prefer semantic HTML elements (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `button`, etc.) when they correctly express the purpose of the content or interaction.
- Use `div` for generic layout or grouping containers that have no semantic meaning.
- Build user interfaces mobile-first.
- Start with the smallest viewport and progressively enhance layouts for larger breakpoints.
- Do not build desktop-first layouts and retrofit mobile behavior afterward.
- Use Tailwind CSS utilities following the project's existing conventions.
- Prefer Tailwind utilities over custom CSS when Tailwind provides a clear and maintainable equivalent.
- Keep responsive behavior, accessibility, and touch interaction in mind when designing UI.

## Security

- Treat frontend authentication and authorization controls as UX/navigation mechanisms, never as security boundaries.
- Never store authentication tokens in `localStorage` or `sessionStorage`.
- Do not expose authentication tokens or other sensitive authentication data to client-side JavaScript.
- Preserve the existing HttpOnly cookie-based authentication and session architecture unless explicitly instructed otherwise.
- Do not weaken existing authentication, session, or security behavior without explicit approval.
- Never expose sensitive, internal, or technical error information directly to users.

## Scope and Change Control

- Modify only files necessary for the requested task.
- Do not refactor unrelated code while implementing a task.
- Preserve existing architecture, naming conventions, and established patterns unless the task explicitly requires changing them.
- If a broader refactor or architectural change appears beneficial, explain it instead of performing it automatically.
- Do not introduce functionality for hypothetical future requirements unless explicitly requested.

## Validation

Before considering an implementation complete:

- Ensure TypeScript compilation succeeds.
- Run the Angular build and ensure the change does not introduce build errors.
- Run relevant tests when they exist or when the change affects tested behavior.
- Do not leave errors or warnings introduced by the implementation.
- For UI changes, verify responsive behavior and accessibility requirements.
- Review the final change for unnecessary complexity, unrelated modifications, and unused code.
