---
name: testing
description: Cómo escribir tests con Jest para el proyecto People. Úsala al crear o modificar tests.
---

# Testing Skill

Esta skill te guía en la escritura de tests para People.

## Configuración

```typescript
// jest.config.ts
export default {
  preset: './jest.preset.js',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Estructura de Tests

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent], // Standalone component
      providers: [
        // Mocks aquí
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when initialized', () => {
    it('should have empty list', () => {
      expect(component.items()).toEqual([]);
    });
  });
});
```

## Mocking Services

```typescript
// Mock de ApiUrlService
const mockApiUrl = {
  build: jest.fn().mockReturnValue('http://mock-url'),
};

// Mock de HttpClient
const mockHttp = {
  get: jest.fn().mockReturnValue(of([])),
  post: jest.fn().mockReturnValue(of({})),
  patch: jest.fn().mockReturnValue(of({})),
};

// En providers
providers: [
  { provide: ApiUrlService, useValue: mockApiUrl },
  { provide: HttpClient, useValue: mockHttp },
];
```

## Testing Signals

```typescript
it('should update signal value', () => {
  // Arrange
  component.isLoading.set(false);

  // Act
  component.loadData();

  // Assert
  expect(component.isLoading()).toBe(true);
});

it('should compute derived value', () => {
  // Arrange
  component.items.set([{ id: 1 }, { id: 2 }]);

  // Assert - computed se recalcula automáticamente
  expect(component.itemCount()).toBe(2);
});
```

## Testing httpResource

```typescript
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';

describe('Component with httpResource', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verificar que no hay requests pendientes
  });

  it('should load data', fakeAsync(() => {
    const mockData = [{ id: 1, name: 'Test' }];

    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url.includes('/employees'));
    req.flush(mockData);

    tick();

    expect(component.employees.value()).toEqual(mockData);
  }));
});
```

## Testing Formularios

```typescript
it('should validate required fields', () => {
  // Form inválido inicialmente
  expect(component.form.valid).toBe(false);

  // Llenar campos requeridos
  component.form.patchValue({
    name: 'Test',
    email: 'test@example.com',
  });

  expect(component.form.valid).toBe(true);
});

it('should submit form', async () => {
  const submitSpy = jest.spyOn(component, 'onSubmit');

  component.form.patchValue({ name: 'Test' });
  await component.onSubmit();

  expect(submitSpy).toHaveBeenCalled();
});
```

## Comandos Útiles

```bash
# Todos los tests
npx nx test

# Con coverage
npx nx test --coverage

# Un archivo específico
npx nx test --testFile=src/app/component.spec.ts

# Watch mode
npx nx test --watch

# Actualizar snapshots
npx nx test --updateSnapshot
```

## Cobertura Mínima

| Métrica    | Mínimo |
| ---------- | ------ |
| Branches   | 80%    |
| Functions  | 80%    |
| Lines      | 80%    |
| Statements | 80%    |
