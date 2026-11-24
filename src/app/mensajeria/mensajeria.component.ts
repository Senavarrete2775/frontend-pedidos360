import { Component, DestroyRef, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface ColaInfo {
  nombre: string;
  mensajes: number;
  consumidores: number;
  existe: boolean;
}

interface ParticionInfo {
  particion: number;
  lider: number | null;
  replicas: number[];
  isr: number[];
}

interface TopicInfo {
  nombre: string;
  totalParticiones: number;
  factorReplicacion: number;
  configuracion?: Record<string, string>;
  particiones?: ParticionInfo[];
}

interface GrupoInfo {
  grupo: string;
  estado: string;
  totalMiembros: number;
}

interface ClusterInfo {
  totalBrokers: number;
  controladorId: number | null;
  brokers: { id: number; host: string; puerto: number }[];
}

interface EventoEstado {
  id: number;
  cliente?: string;
  producto?: string;
  monto?: number;
  estado?: string;
  tipoEvento?: string;
}

interface LogLinea {
  hora: string;
  tipo: 'info' | 'ok' | 'warn' | 'error';
  texto: string;
}

type Disponibilidad = 'cargando' | 'online' | 'offline';

@Component({
  selector: 'app-mensajeria',
  standalone: true,
  styleUrl: './mensajeria.component.css',
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Flujo de mensajería asíncrona</h1>
          <p class="lead">
            Cuando se crea un pedido, el backend lo guarda en PostgreSQL y <strong>responde de inmediato</strong>.
            El trabajo pesado (notificar, generar ticket, auditar, analizar) lo hacen otros servicios
            <strong>después</strong>, leyendo mensajes desde RabbitMQ y Kafka. Este panel muestra ese recorrido en vivo.
          </p>
        </div>
        <label class="auto-toggle">
          <input type="checkbox" [checked]="autoRefresh()" (change)="toggleAuto($event)" />
          Actualizar cada {{ intervaloSeg }} s
        </label>
      </header>

      <!-- Diagrama del recorrido -->
      <section class="card">
        <h2 class="card-title">Recorrido de un pedido</h2>
        <div class="flow">
          <div class="node node-client">
            <span class="node-step">1</span>
            <strong>Frontend</strong>
            <small>POST /api/pedidos</small>
          </div>
          <div class="arrow">→</div>
          <div class="node node-backend">
            <span class="node-step">2</span>
            <strong>backend-pedidos360</strong>
            <small>Guarda en PostgreSQL y publica el evento sin esperar a nadie</small>
          </div>
          <div class="arrow">→</div>
          <div class="node-col">
            <div class="node node-rabbit">
              <span class="node-step">3a</span>
              <strong>RabbitMQ</strong>
              <small>{{ colasPrincipales().length }} colas · {{ colasDlq().length }} DLQ · exchanges topic y direct</small>
            </div>
            <div class="node node-kafka">
              <span class="node-step">3b</span>
              <strong>Kafka</strong>
              <small>{{ topics().length }} topics · {{ cluster()?.totalBrokers ?? '–' }} brokers</small>
            </div>
          </div>
          <div class="arrow">→</div>
          <div class="node node-consumers">
            <span class="node-step">4</span>
            <strong>ms-notificaciones</strong>
            <small>Consumidores: notificación, ticket, auditoría, analítica, estado</small>
          </div>
        </div>
        <p class="hint">
          Si un consumidor rechaza un mensaje (por ejemplo, un monto inválido), RabbitMQ lo desvía a la
          <strong>cola de errores (DLQ)</strong> en lugar de perderlo.
        </p>
      </section>

      <!-- Prueba en vivo -->
      <section class="card">
        <h2 class="card-title">Probar el flujo</h2>
        <p class="hint">
          Envía un pedido y observa cuánto tarda en aparecer procesado por los consumidores de Kafka.
          La respuesta del backend llega antes: eso es lo asíncrono.
        </p>
        <div class="actions">
          <button class="btn btn-primary" [disabled]="probando()" (click)="enviarPedidoPrueba()">
            Enviar pedido de prueba
          </button>
          <button class="btn btn-warn" [disabled]="probando()" (click)="enviarFalloDlq()">
            Simular mensaje fallido (va a la DLQ)
          </button>
          <button class="btn btn-ghost" (click)="limpiarLog()">Limpiar registro</button>
        </div>
        <div class="log" role="log" aria-live="polite">
          @if (log().length === 0) {
            <div class="log-empty">Aún no hay eventos. Presiona un botón para empezar.</div>
          }
          @for (l of log(); track $index) {
            <div class="log-line log-{{ l.tipo }}">
              <span class="log-time">{{ l.hora }}</span>
              <span>{{ l.texto }}</span>
            </div>
          }
        </div>
      </section>

      <div class="grid-2">
        <!-- RabbitMQ -->
        <section class="card">
          <div class="card-head">
            <h2 class="card-title">RabbitMQ · colas</h2>
            <span class="status status-{{ rabbitEstado() }}">{{ etiqueta(rabbitEstado()) }}</span>
          </div>
          @if (rabbitEstado() === 'offline') {
            <p class="offline">No se pudo consultar ms-rabbit-admin ({{ rabbitUrl }}).</p>
          }
          <table class="table">
            <thead>
              <tr><th>Cola</th><th class="num">Mensajes</th><th class="num">Consumidores</th></tr>
            </thead>
            <tbody>
              @for (q of colasPrincipales(); track q.nombre) {
                <tr>
                  <td><code>{{ q.nombre }}</code></td>
                  <td class="num">{{ q.mensajes }}</td>
                  <td class="num">{{ q.consumidores }}</td>
                </tr>
              }
              @for (q of colasDlq(); track q.nombre) {
                <tr class="row-dlq">
                  <td><code>{{ q.nombre }}</code> <span class="tag tag-dlq">DLQ</span></td>
                  <td class="num" [class.has-msgs]="q.mensajes > 0">{{ q.mensajes }}</td>
                  <td class="num">{{ q.consumidores }}</td>
                </tr>
              }
              @if (colas().length === 0 && rabbitEstado() !== 'cargando') {
                <tr><td colspan="3" class="empty">Sin colas para mostrar.</td></tr>
              }
            </tbody>
          </table>
          <p class="hint">
            Las colas normales suelen mostrar 0 mensajes porque los consumidores las vacían al instante.
            Los mensajes que se acumulan en una DLQ son los que fallaron.
          </p>
        </section>

        <!-- Kafka -->
        <section class="card">
          <div class="card-head">
            <h2 class="card-title">Kafka · clúster</h2>
            <span class="status status-{{ kafkaEstado() }}">{{ etiqueta(kafkaEstado()) }}</span>
          </div>
          @if (kafkaEstado() === 'offline') {
            <p class="offline">No se pudo consultar ms-kafka-admin ({{ kafkaUrl }}).</p>
          }
          @if (cluster(); as c) {
            <div class="brokers">
              @for (b of c.brokers; track b.id) {
                <span class="broker" [class.broker-ctrl]="b.id === c.controladorId">
                  Broker {{ b.id }}<small>{{ b.host }}:{{ b.puerto }}</small>
                  @if (b.id === c.controladorId) { <em>controlador</em> }
                </span>
              }
            </div>
          }
          <table class="table">
            <thead>
              <tr><th>Topic</th><th class="num">Particiones</th><th class="num">Réplicas</th></tr>
            </thead>
            <tbody>
              @for (t of topics(); track t.nombre) {
                <tr>
                  <td><code>{{ t.nombre }}</code></td>
                  <td class="num">{{ t.totalParticiones }}</td>
                  <td class="num">{{ t.factorReplicacion }}</td>
                </tr>
              }
              @if (topics().length === 0 && kafkaEstado() !== 'cargando') {
                <tr><td colspan="3" class="empty">Sin topics para mostrar.</td></tr>
              }
            </tbody>
          </table>

          @if (primerTopicConParticiones(); as t) {
            <h3 class="sub">Particiones de <code>{{ t.nombre }}</code></h3>
            <table class="table table-compact">
              <thead><tr><th>Part.</th><th>Líder</th><th>Réplicas</th><th>ISR</th></tr></thead>
              <tbody>
                @for (p of t.particiones; track p.particion) {
                  <tr>
                    <td>{{ p.particion }}</td>
                    <td>broker {{ p.lider ?? '–' }}</td>
                    <td>{{ p.replicas.join(', ') }}</td>
                    <td>{{ p.isr.join(', ') }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }

          <h3 class="sub">Consumer groups</h3>
          <div class="chips">
            @for (g of grupos(); track g.grupo) {
              <span class="chip chip-{{ g.estado === 'Stable' ? 'ok' : 'warn' }}">
                {{ g.grupo }} · {{ g.estado }} · {{ g.totalMiembros }} miembro(s)
              </span>
            }
            @if (grupos().length === 0) {
              <span class="empty">Sin consumer groups activos todavía.</span>
            }
          </div>
        </section>
      </div>

      <!-- Resultados procesados -->
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">Lo que procesaron los consumidores de Kafka</h2>
          <span class="status status-{{ notifEstado() }}">{{ etiqueta(notifEstado()) }}</span>
        </div>
        @if (notifEstado() === 'offline') {
          <p class="offline">No se pudo consultar ms-notificaciones ({{ notifUrl }}).</p>
        }
        <div class="grid-2">
          <div>
            <h3 class="sub">Analítica (analitica-group)</h3>
            @if (analitica().length === 0) {
              <p class="empty">Sin datos todavía.</p>
            }
            <dl class="kv">
              @for (e of analitica(); track e[0]) {
                <dt>{{ e[0] }}</dt>
                <dd>{{ formatear(e[1]) }}</dd>
              }
            </dl>
          </div>
          <div>
            <h3 class="sub">Último estado por pedido (estado-group)</h3>
            <table class="table table-compact">
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Estado</th><th>Evento</th></tr></thead>
              <tbody>
                @for (e of estados(); track e.id) {
                  <tr>
                    <td>#{{ e.id }}</td>
                    <td>{{ e.cliente }}</td>
                    <td>{{ e.estado }}</td>
                    <td>{{ e.tipoEvento }}</td>
                  </tr>
                }
                @if (estados().length === 0) {
                  <tr><td colspan="4" class="empty">Sin pedidos procesados todavía.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  `
})
export class MensajeriaComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly intervaloSeg = 4;
  readonly rabbitUrl = environment.rabbitAdminApiUrl;
  readonly kafkaUrl = environment.kafkaAdminApiUrl;
  readonly notifUrl = environment.notificacionesApiUrl;

  readonly colas = signal<ColaInfo[]>([]);
  readonly topics = signal<TopicInfo[]>([]);
  readonly grupos = signal<GrupoInfo[]>([]);
  readonly cluster = signal<ClusterInfo | null>(null);
  readonly analiticaRaw = signal<Record<string, unknown>>({});
  readonly estadosRaw = signal<Record<string, EventoEstado>>({});

  readonly rabbitEstado = signal<Disponibilidad>('cargando');
  readonly kafkaEstado = signal<Disponibilidad>('cargando');
  readonly notifEstado = signal<Disponibilidad>('cargando');

  readonly autoRefresh = signal(true);
  readonly probando = signal(false);
  readonly log = signal<LogLinea[]>([]);

  readonly colasDlq = computed(() => this.colas().filter((q) => this.esDlq(q.nombre)));
  readonly colasPrincipales = computed(() => this.colas().filter((q) => !this.esDlq(q.nombre)));
  readonly primerTopicConParticiones = computed(() =>
    this.topics().find((t) => (t.particiones?.length ?? 0) > 0) ?? null
  );
  readonly analitica = computed(() => Object.entries(this.analiticaRaw()));
  readonly estados = computed(() =>
    Object.values(this.estadosRaw()).sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 8)
  );

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return; // en el servidor (SSR) no se consulta nada
    }
    this.refrescarTodo();
    this.iniciarTimer();
    this.destroyRef.onDestroy(() => this.detenerTimer());
  }

  ngOnDestroy(): void {
    this.detenerTimer();
  }

  toggleAuto(ev: Event): void {
    const activo = (ev.target as HTMLInputElement).checked;
    this.autoRefresh.set(activo);
    if (activo) {
      this.iniciarTimer();
    } else {
      this.detenerTimer();
    }
  }

  etiqueta(e: Disponibilidad): string {
    return e === 'online' ? 'En línea' : e === 'offline' ? 'Sin conexión' : 'Consultando…';
  }

  formatear(v: unknown): string {
    return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
  }

  limpiarLog(): void {
    this.log.set([]);
  }

  // ---------- Pruebas ----------

  enviarPedidoPrueba(): void {
    this.probando.set(true);
    const t0 = Date.now();
    const payload = {
      cliente: 'Cliente Demo',
      producto: 'Prueba de mensajería ' + new Date().toLocaleTimeString('es-CL'),
      monto: 15000,
      estado: 'PENDIENTE'
    };
    this.anotar('info', 'Enviando pedido al backend…');
    this.http.post<{ id: number }>(`${environment.apiBaseUrl}/api/pedidos`, payload).subscribe({
      next: (res) => {
        const ms = Date.now() - t0;
        this.anotar('ok', `Backend respondió en ${ms} ms: pedido #${res.id} guardado y evento publicado en RabbitMQ y Kafka.`);
        this.anotar('info', 'El backend ya respondió. Esperando a que los consumidores lo procesen…');
        this.esperarProcesamiento(res.id, t0);
      },
      error: (err) => {
        this.anotar('error', `El backend rechazó el pedido: ${err.error?.message || err.statusText || err.message}`);
        this.probando.set(false);
      }
    });
  }

  enviarFalloDlq(): void {
    this.probando.set(true);
    const base = this.colasDlq().reduce((s, q) => s + q.mensajes, 0);
    this.anotar('info', `Mensajes en DLQ antes de la prueba: ${base}. Enviando mensaje inválido…`);
    this.http.post<{ mensaje?: string }>(`${environment.apiBaseUrl}/api/pedidos/simular-error-dlq`, {}).subscribe({
      next: (res) => {
        this.anotar('ok', res.mensaje || 'Mensaje de fallo publicado.');
        this.esperarDlq(base, Date.now());
      },
      error: (err) => {
        this.anotar('error', `No se pudo publicar el fallo: ${err.error?.message || err.statusText || err.message}`);
        this.probando.set(false);
      }
    });
  }

  private esperarProcesamiento(id: number, t0: number): void {
    let intentos = 0;
    const revisar = () => {
      intentos++;
      this.http.get<Record<string, EventoEstado>>(`${environment.notificacionesApiUrl}/api/notifications/kafka/estados`).subscribe({
        next: (estados) => {
          this.estadosRaw.set(estados || {});
          if (estados && estados[String(id)]) {
            this.anotar('ok', `estado-group procesó el pedido #${id} ${Date.now() - t0} ms después de enviarlo.`);
            this.cargarNotificaciones();
            this.cargarColas();
            this.probando.set(false);
          } else if (intentos < 15) {
            setTimeout(revisar, 800);
          } else {
            this.anotar('warn', 'No se vio el pedido procesado en 12 s. Revisa que ms-notificaciones y Kafka estén arriba.');
            this.probando.set(false);
          }
        },
        error: () => {
          this.anotar('warn', 'No se pudo consultar ms-notificaciones para confirmar el procesamiento.');
          this.probando.set(false);
        }
      });
    };
    setTimeout(revisar, 600);
  }

  private esperarDlq(base: number, t0: number): void {
    let intentos = 0;
    const revisar = () => {
      intentos++;
      this.http.get<ColaInfo[]>(`${environment.rabbitAdminApiUrl}/queues`).subscribe({
        next: (colas) => {
          this.colas.set(colas || []);
          const ahora = (colas || []).filter((q) => this.esDlq(q.nombre)).reduce((s, q) => s + q.mensajes, 0);
          if (ahora > base) {
            this.anotar('ok', `El mensaje fallido llegó a la DLQ en ${Date.now() - t0} ms (ahora hay ${ahora}).`);
            this.probando.set(false);
          } else if (intentos < 10) {
            setTimeout(revisar, 800);
          } else {
            this.anotar('warn', 'La DLQ no aumentó. Si hay un consumidor de DLQ activo, el mensaje ya se consumió.');
            this.probando.set(false);
          }
        },
        error: () => {
          this.anotar('warn', 'No se pudo consultar ms-rabbit-admin.');
          this.probando.set(false);
        }
      });
    };
    setTimeout(revisar, 600);
  }

  // ---------- Carga de datos ----------

  private refrescarTodo(): void {
    this.cargarColas();
    this.cargarKafka();
    this.cargarNotificaciones();
  }

  private cargarColas(): void {
    this.http.get<ColaInfo[]>(`${environment.rabbitAdminApiUrl}/queues`).subscribe({
      next: (c) => {
        this.colas.set(c || []);
        this.rabbitEstado.set('online');
      },
      error: () => this.rabbitEstado.set('offline')
    });
  }

  private cargarKafka(): void {
    const base = environment.kafkaAdminApiUrl;
    this.http.get<ClusterInfo>(`${base}/cluster`).subscribe({
      next: (c) => {
        this.cluster.set(c);
        this.kafkaEstado.set('online');
      },
      error: () => this.kafkaEstado.set('offline')
    });
    this.http.get<TopicInfo[]>(`${base}/topics`).subscribe({
      next: (t) => this.topics.set(t || []),
      error: () => this.kafkaEstado.set('offline')
    });
    this.http.get<GrupoInfo[]>(`${base}/consumer-groups`).subscribe({
      next: (g) => this.grupos.set(g || []),
      error: () => undefined
    });
  }

  private cargarNotificaciones(): void {
    const base = `${environment.notificacionesApiUrl}/api/notifications/kafka`;
    this.http.get<Record<string, unknown>>(`${base}/analitica`).subscribe({
      next: (a) => {
        this.analiticaRaw.set(a || {});
        this.notifEstado.set('online');
      },
      error: () => this.notifEstado.set('offline')
    });
    this.http.get<Record<string, EventoEstado>>(`${base}/estados`).subscribe({
      next: (e) => this.estadosRaw.set(e || {}),
      error: () => this.notifEstado.set('offline')
    });
  }

  private iniciarTimer(): void {
    this.detenerTimer();
    this.timer = setInterval(() => this.refrescarTodo(), this.intervaloSeg * 1000);
  }

  private detenerTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private esDlq(nombre: string): boolean {
    return /dlq|dead/i.test(nombre);
  }

  private anotar(tipo: LogLinea['tipo'], texto: string): void {
    const hora = new Date().toLocaleTimeString('es-CL', { hour12: false });
    this.log.update((l) => [...l, { hora, tipo, texto }]);
  }
}
