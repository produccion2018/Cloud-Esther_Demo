import type { ArticuloBlog } from "./blog";

/* Ubicación: src/lib/blog/articulos-iniciales.ts
   Artículos con los que arranca el blog cuando NO hay backend conectado (demo en el navegador).
   Con backend, estos mismos artículos los carga la migración 0035 del servidor una sola vez. */

export const ARTICULOS_INICIALES: ArticuloBlog[] = [
  {
    "id": "inicial-1",
    "slug": "odontologia-digital-que-cambia-en-la-consulta",
    "title": "Odontología digital: qué cambia en la consulta y por dónde empezar",
    "excerpt": "Escáneres intraorales, odontograma 3D, historia clínica en la nube y comunicación con el paciente. Un mapa claro para dar el salto digital sin perder el foco en la atención.",
    "category": "Odontología digital",
    "tags": [
      "transformación digital",
      "odontograma 3D",
      "flujo digital"
    ],
    "content": "La odontología digital dejó de ser una promesa para convertirse en la forma habitual de trabajar en muchas clínicas. No se trata de comprar equipos caros de un día para el otro, sino de ordenar el flujo de trabajo para que la información del paciente esté siempre disponible, completa y fácil de explicar.\n\n## Qué entendemos por odontología digital\n\nEs el uso de herramientas digitales en todas las etapas de la atención: el registro de datos, el diagnóstico, la planificación del tratamiento, la comunicación con el paciente y la gestión administrativa. Algunas tecnologías son clínicas (escáneres intraorales, radiografía digital, diseño asistido) y otras son de gestión (agenda online, historia clínica electrónica, presupuestos y cobros).\n\n## Por dónde conviene empezar\n\nLa mayoría de las clínicas obtiene el mayor beneficio cuando empieza por la base: tener la información ordenada.\n\n- **Historia clínica electrónica:** antecedentes, evoluciones, consentimientos y estudios en un solo lugar, accesible desde cualquier sede.\n- **Odontograma digital:** el estado de cada pieza actualizado en cada consulta, con su historial.\n- **Agenda con recordatorios:** menos ausencias y menos tiempo de la recepción al teléfono.\n- **Presupuestos claros:** por etapas, con opciones de financiación y seguimiento.\n\nCon esa base, sumar tecnología clínica es mucho más simple, porque cada estudio nuevo se integra a un historial que ya existe.\n\n## La comunicación con el paciente también es digital\n\nUn odontograma 3D o una imagen clínica bien presentada ayudan a que el paciente entienda qué le pasa y por qué se le propone un tratamiento. Cuando el paciente entiende, decide con más confianza.\n\n> La tecnología suma cuando ahorra tiempo al equipo y hace más clara la explicación al paciente. Si complica, no está bien implementada.\n\n## Errores frecuentes al digitalizar\n\n1. Cargar datos en varios sistemas que no se hablan entre sí.\n2. No definir quién del equipo puede ver o modificar cada información.\n3. Digitalizar sin capacitar al equipo.\n4. Olvidar la copia de seguridad y la privacidad de los datos de salud.\n\n## En resumen\n\nEl salto digital se da paso a paso: primero el orden de la información, después la automatización y por último la tecnología clínica avanzada. Lo importante es que cada herramienta mejore la experiencia del paciente y el día a día del equipo.",
    "coverUrl": null,
    "coverAlt": "",
    "authorName": "Equipo Cloud Esther",
    "authorRole": "",
    "status": "published",
    "featured": true,
    "publishedAt": "2026-11-24T12:00:00.000Z",
    "updatedAt": "2026-11-24T12:00:00.000Z"
  },
  {
    "id": "inicial-2",
    "slug": "como-reducir-el-ausentismo-de-pacientes",
    "title": "Cómo reducir el ausentismo de pacientes con recordatorios y listas de espera",
    "excerpt": "Cada turno vacío es tiempo clínico perdido. Te contamos cómo combinar confirmaciones, recordatorios y listas de espera para que la agenda se mantenga llena.",
    "category": "Gestión de la clínica",
    "tags": [
      "agenda",
      "recordatorios",
      "automatizaciones"
    ],
    "content": "Las ausencias sin aviso son uno de los problemas más comunes en la gestión de una clínica odontológica. Un sillón vacío no solo significa un ingreso que no llega: también es un espacio que otro paciente podría haber aprovechado.\n\n## Por qué los pacientes faltan\n\nEn la mayoría de los casos no es falta de interés. Los motivos más habituales son el olvido, un imprevisto de último momento o la dificultad para avisar que no van a poder asistir. Por eso las soluciones más efectivas apuntan a recordar, a facilitar la confirmación y a reasignar el horario rápidamente.\n\n## Tres herramientas que funcionan juntas\n\n### 1. Confirmación anticipada\n\nUn mensaje uno o dos días antes, con la opción de confirmar o reprogramar con un toque. Si el paciente avisa que no puede venir, el horario queda libre con tiempo.\n\n### 2. Recordatorio cercano a la consulta\n\nUn segundo aviso algunas horas antes, breve y claro: día, hora, profesional y dirección de la sede.\n\n### 3. Lista de espera\n\nCuando un turno se libera, ofrecerlo a los pacientes que estaban esperando un horario. Lo ideal es que la oferta tenga un vencimiento y que el primero que acepta se quede con el turno, para evitar dobles reservas.\n\n## Buenas prácticas en los mensajes\n\n- Usá el nombre del paciente y del profesional.\n- Indicá con claridad cómo confirmar o cambiar el turno.\n- Respetá el canal que el paciente prefiere (WhatsApp, correo o SMS).\n- No envíes más mensajes de los necesarios.\n\n> Un buen recordatorio no presiona: facilita. El objetivo es que al paciente le resulte más fácil avisar que faltar.\n\n## Medir para mejorar\n\nRevisá cada mes cuántos turnos se confirmaron, cuántos se reprogramaron y cuántos quedaron vacíos. Con esos datos vas a saber qué ajustar: el horario del recordatorio, el texto o la anticipación de la confirmación.\n\n## En Cloud Esther\n\nLa agenda permite automatizar confirmaciones y recordatorios, y la recuperación de turnos ofrece los horarios cancelados a la lista de espera sin que la recepción tenga que llamar uno por uno.",
    "coverUrl": null,
    "coverAlt": "",
    "authorName": "Equipo Cloud Esther",
    "authorRole": "",
    "status": "published",
    "featured": false,
    "publishedAt": "2026-11-20T12:00:00.000Z",
    "updatedAt": "2026-11-20T12:00:00.000Z"
  },
  {
    "id": "inicial-3",
    "slug": "periodontograma-por-que-registrarlo-en-cada-control",
    "title": "Periodontograma: por qué registrarlo en cada control",
    "excerpt": "El sondaje periodontal muestra cómo evoluciona la salud de las encías a lo largo del tiempo. Registrarlo de forma ordenada facilita el diagnóstico, el seguimiento y la explicación al paciente.",
    "category": "Clínica",
    "tags": [
      "periodoncia",
      "diagnóstico",
      "seguimiento"
    ],
    "content": "El periodontograma es el registro gráfico del estado periodontal de cada pieza dentaria. Reúne datos como la profundidad de sondaje, el nivel de inserción, el sangrado al sondaje, la movilidad y el compromiso de furcaciones.\n\n## Por qué es importante registrarlo siempre\n\nLa enfermedad periodontal suele avanzar sin dolor. Muchas veces el paciente no percibe cambios hasta que el problema ya está establecido. Un registro periódico permite detectar variaciones a tiempo y comparar cada control con los anteriores.\n\n- **Diagnóstico:** ofrece una imagen completa del estado de las encías.\n- **Seguimiento:** muestra si el tratamiento está dando resultado.\n- **Comunicación:** ayuda al paciente a comprender su situación y la importancia del mantenimiento.\n- **Respaldo:** deja documentado el estado clínico en cada momento.\n\n## Qué conviene registrar\n\n1. Profundidad de sondaje en varios sitios por pieza.\n2. Recesión o margen gingival.\n3. Sangrado al sondaje y presencia de placa.\n4. Movilidad dentaria.\n5. Lesiones de furcación en molares.\n\n## La ventaja del registro digital\n\nEn papel, comparar controles lleva tiempo. En un sistema digital, cada medición queda asociada a la pieza y a la fecha, y se puede ver la evolución de un vistazo. Cuando el periodontograma se integra con el odontograma, el profesional tiene en una sola vista el estado dentario y periodontal.\n\n> Un periodontograma actualizado es una de las mejores herramientas para motivar al paciente a sostener sus controles de mantenimiento.\n\n## Privacidad de los datos\n\nEl periodontograma es información de salud. Lo recomendable es que solo lo vean y lo modifiquen los profesionales que atienden al paciente, y que el personal administrativo no tenga acceso a esos datos.\n\n## Para recordar\n\nRegistrar el periodontograma en cada control lleva pocos minutos cuando la herramienta es ágil, y el beneficio para el diagnóstico y el seguimiento es enorme.",
    "coverUrl": null,
    "coverAlt": "",
    "authorName": "Equipo Cloud Esther",
    "authorRole": "",
    "status": "published",
    "featured": false,
    "publishedAt": "2026-11-17T12:00:00.000Z",
    "updatedAt": "2026-11-17T12:00:00.000Z"
  },
  {
    "id": "inicial-4",
    "slug": "inteligencia-artificial-en-radiografias-dentales",
    "title": "Inteligencia artificial en radiografías dentales: lo que hay que saber",
    "excerpt": "La IA puede ayudar a señalar áreas a revisar en una radiografía, pero el diagnóstico sigue siendo del profesional. Qué puede aportar, cuáles son sus límites y cómo usarla con responsabilidad.",
    "category": "Inteligencia artificial",
    "tags": [
      "IA",
      "radiología",
      "diagnóstico asistido"
    ],
    "content": "La inteligencia artificial aplicada a imágenes dentales es uno de los temas que más interés despierta en la odontología actual. Hay herramientas capaces de analizar radiografías y señalar zonas que merecen atención. Pero conviene entender bien qué hacen y qué no.\n\n## Qué puede aportar la IA\n\n- **Una segunda mirada:** marca áreas que el profesional puede revisar con más detalle.\n- **Orden y rapidez:** ubica los hallazgos por pieza y los deja listos para registrar.\n- **Comunicación:** una imagen con marcas claras ayuda a explicar al paciente lo que se observa.\n\n## Cuáles son sus límites\n\nLa IA no reemplaza el criterio clínico. Una herramienta puede equivocarse por la calidad de la imagen, la posición, los artefactos o casos poco frecuentes. Por eso cualquier marca debe considerarse una sugerencia para revisar, nunca un diagnóstico cerrado.\n\n> La regla de oro: la IA sugiere, el profesional confirma, corrige o descarta. La decisión clínica siempre es humana.\n\n## Cómo usarla con responsabilidad\n\n1. Elegir herramientas que muestren con claridad que sus resultados son preliminares.\n2. Revisar cada hallazgo antes de registrarlo en la historia clínica.\n3. Informar al paciente que se trata de un apoyo tecnológico y no de un diagnóstico automático.\n4. Cuidar la privacidad: las imágenes son datos de salud.\n\n## El rol del profesional sigue siendo central\n\nLa experiencia clínica, la exploración y la conversación con el paciente no se reemplazan. La IA es valiosa cuando libera tiempo para lo importante y ayuda a no pasar por alto un detalle.\n\n## En Cloud Esther\n\nEl análisis de rayos X dentro del odontograma 3D marca áreas a revisar y deja que el profesional confirme, cambie el tipo de hallazgo, lo descarte o marque a mano. Nada se presenta como diagnóstico.",
    "coverUrl": null,
    "coverAlt": "",
    "authorName": "Equipo Cloud Esther",
    "authorRole": "",
    "status": "published",
    "featured": false,
    "publishedAt": "2026-11-13T12:00:00.000Z",
    "updatedAt": "2026-11-13T12:00:00.000Z"
  },
  {
    "id": "inicial-5",
    "slug": "historia-clinica-digital-seguridad-y-privacidad",
    "title": "Historia clínica digital: buenas prácticas de seguridad y privacidad",
    "excerpt": "Los datos de salud son de los más sensibles que existen. Te compartimos una guía práctica para proteger la información de tus pacientes en el día a día de la clínica.",
    "category": "Seguridad y datos",
    "tags": [
      "privacidad",
      "historia clínica",
      "seguridad"
    ],
    "content": "Pasar de la ficha en papel a la historia clínica digital trae muchas ventajas: la información está ordenada, disponible desde cualquier sede y protegida contra pérdidas. Pero también exige nuevas responsabilidades. Los datos de salud son especialmente sensibles y su protección es una obligación ética y, en la mayoría de los países, legal.\n\n## Principios básicos\n\n- **Acceso según la función:** cada persona del equipo ve solo lo que necesita para su trabajo.\n- **Contraseñas propias:** nada de usuarios compartidos en la recepción.\n- **Registro de actividad:** saber quién ingresó, cuándo y qué modificó.\n- **Copias de seguridad:** la información no puede depender de una sola computadora.\n\n## Quién debería ver qué\n\nUna práctica recomendable es separar la información administrativa de la clínica. La recepción necesita la agenda, los datos de contacto y los cobros, pero no necesariamente la historia clínica, el periodontograma o las imágenes. Los profesionales, en cambio, necesitan el detalle clínico de sus pacientes.\n\n## Hábitos simples que marcan la diferencia\n\n1. Cerrar la sesión al dejar el puesto de trabajo.\n2. Activar la verificación en dos pasos en las cuentas con más permisos.\n3. No enviar historias clínicas por canales no seguros.\n4. Dar de baja enseguida los accesos de quien deja de trabajar en la clínica.\n5. Pedir el consentimiento del paciente para el uso de sus imágenes.\n\n> La seguridad no es solo tecnología: es también una cultura de trabajo en todo el equipo.\n\n## El paciente también es parte\n\nCuando el paciente puede ver sus turnos, presupuestos y documentos en un portal propio, y otorgar o revocar autorizaciones, la relación se vuelve más transparente.\n\n## En Cloud Esther\n\nCada clínica tiene sus datos separados de las demás, los permisos se definen por rol y por persona, y la información de salud queda fuera del alcance de los roles administrativos.",
    "coverUrl": null,
    "coverAlt": "",
    "authorName": "Equipo Cloud Esther",
    "authorRole": "",
    "status": "published",
    "featured": false,
    "publishedAt": "2026-11-09T12:00:00.000Z",
    "updatedAt": "2026-11-09T12:00:00.000Z"
  },
  {
    "id": "inicial-6",
    "slug": "marketing-odontologico-etico",
    "title": "Marketing odontológico ético: cómo atraer pacientes sin promesas vacías",
    "excerpt": "Redes sociales, reseñas, referidos y contenido útil. Estrategias para que más pacientes conozcan tu clínica, cuidando la confianza y la normativa profesional.",
    "category": "Marketing dental",
    "tags": [
      "marketing",
      "redes sociales",
      "captación de pacientes"
    ],
    "content": "Atraer nuevos pacientes es una necesidad de cualquier clínica, pero en salud la comunicación tiene reglas propias. La confianza es el principal activo, y se construye con información clara, honesta y útil.\n\n## Contenido que ayuda\n\nLas publicaciones que mejor funcionan son las que responden dudas reales: cómo cuidar los dientes después de una extracción, cada cuánto hacer un control, qué opciones existen para reemplazar una pieza. El contenido educativo posiciona a la clínica como referente sin necesidad de exagerar.\n\n## Reseñas y recomendaciones\n\n- Pedí la opinión del paciente al terminar un tratamiento, cuando la experiencia está fresca.\n- Respondé todas las reseñas, también las negativas, con respeto y sin datos clínicos.\n- Un programa de referidos reconoce a quienes recomiendan la clínica.\n\n## Lo que conviene evitar\n\n1. Prometer resultados garantizados.\n2. Publicar fotos de pacientes sin su consentimiento escrito.\n3. Usar imágenes de antes y después retocadas.\n4. Comunicar precios o promociones que generen confusión.\n\n> En odontología, el mejor marketing sigue siendo un paciente bien atendido que se siente cómodo recomendando a su profesional.\n\n## Ordenar los contactos que llegan\n\nDe poco sirve una campaña si los mensajes que llegan por redes o por la web se pierden. Registrar cada contacto, su origen y su estado permite hacer el seguimiento y saber qué acciones traen pacientes de verdad.\n\n## Medir y ajustar\n\nRevisá cada mes de dónde llegan los nuevos pacientes: redes, buscadores, recomendaciones o campañas. Con esa información vas a poder invertir tiempo y presupuesto donde realmente rinde.",
    "coverUrl": null,
    "coverAlt": "",
    "authorName": "Equipo Cloud Esther",
    "authorRole": "",
    "status": "published",
    "featured": false,
    "publishedAt": "2026-11-05T12:00:00.000Z",
    "updatedAt": "2026-11-05T12:00:00.000Z"
  },
  {
    "id": "inicial-7",
    "slug": "presupuestos-odontologicos-que-los-pacientes-aceptan",
    "title": "Presupuestos odontológicos que los pacientes aceptan: claridad, etapas y financiación",
    "excerpt": "Un buen presupuesto no es solo una lista de precios. Explica, ordena las prioridades y facilita la decisión. Claves para mejorar la aceptación de tratamientos.",
    "category": "Gestión de la clínica",
    "tags": [
      "presupuestos",
      "aceptación de tratamientos",
      "financiación"
    ],
    "content": "Muchos tratamientos indicados nunca empiezan. No siempre es por el costo: a veces el paciente no entendió del todo la propuesta, no supo por dónde empezar o simplemente nadie volvió a contactarlo.\n\n## Un presupuesto que se entiende\n\n- **Lenguaje claro:** nombres de tratamientos comprensibles para el paciente.\n- **Por etapas:** primero lo urgente, después lo funcional y por último lo estético.\n- **Opciones:** cuando es posible, alternativas con distintos alcances.\n- **Vigencia:** una fecha hasta la que se mantienen los valores.\n\n## Explicar antes de entregar\n\nUn presupuesto entregado sin conversación es mucho más difícil de aceptar. Mostrar el odontograma, las imágenes clínicas o una simulación ayuda a que el paciente vea lo mismo que ve el profesional.\n\n> Cuando el paciente entiende el porqué de cada etapa, el precio deja de ser el único criterio de decisión.\n\n## Facilitar el pago\n\nOfrecer planes de financiación o pago en cuotas, con condiciones claras desde el principio, reduce una de las principales barreras para empezar el tratamiento.\n\n## El seguimiento hace la diferencia\n\n1. Enviar el presupuesto por el canal que prefiere el paciente.\n2. Contactarlo a los pocos días para resolver dudas.\n3. Recordar la fecha de vigencia antes de que venza.\n4. Registrar si fue aceptado, rechazado o aceptado en parte.\n\n## En Cloud Esther\n\nLos presupuestos se arman con aranceles y plantillas propias, se pueden dividir en etapas y planes de financiación, el paciente los ve en su portal y las automatizaciones recuerdan los que siguen sin respuesta.",
    "coverUrl": null,
    "coverAlt": "",
    "authorName": "Equipo Cloud Esther",
    "authorRole": "",
    "status": "published",
    "featured": false,
    "publishedAt": "2026-10-30T12:00:00.000Z",
    "updatedAt": "2026-10-30T12:00:00.000Z"
  },
  {
    "id": "inicial-8",
    "slug": "odontograma-3d-comunicar-el-tratamiento",
    "title": "Odontograma 3D: comunicar el tratamiento para que el paciente lo entienda",
    "excerpt": "Ver la propia boca en tres dimensiones cambia la conversación en el sillón. Cómo aprovechar el odontograma 3D para explicar diagnósticos, planes y avances.",
    "category": "Novedades",
    "tags": [
      "odontograma 3D",
      "comunicación",
      "Cloud Esther"
    ],
    "content": "El odontograma es una herramienta clásica de la odontología, pero tradicionalmente pensada para el profesional. Su versión tridimensional suma algo muy valioso: el paciente también puede entenderlo.\n\n## Del esquema a la boca real\n\nEn un odontograma 3D cada pieza se ve con su forma y su ubicación, y se puede girar y acercar. El estado de cada diente (sano, tratado, con caries, ausente, con corona o implante) aparece con colores claros, y cada pieza tiene su ficha con tratamientos, historial, imágenes y notas.\n\n## Ventajas en la consulta\n\n- **Explicación visual:** el paciente ve exactamente de qué pieza se habla.\n- **Plan de tratamiento ordenado:** lo planificado y lo realizado quedan diferenciados.\n- **Historial por pieza:** cada intervención queda registrada con su fecha.\n- **Informe para llevar:** un resumen a color que el paciente puede consultar en su casa.\n\n> Cuando el paciente se ve a sí mismo en la pantalla, las preguntas cambian: deja de preguntar cuánto cuesta y empieza a preguntar cuándo empezamos.\n\n## Integrado con el resto de la información\n\nEl odontograma rinde más cuando no está aislado. Si se conecta con la historia clínica, el periodontograma, las radiografías y el presupuesto, cada consulta suma información al mismo registro.\n\n## Disponible en Cloud Esther\n\nLos planes Plus y Enterprise incluyen el odontograma 3D con ficha por pieza, periodoncia, análisis de rayos X y notas de voz. En Start y Pro se puede sumar como módulo adicional.",
    "coverUrl": null,
    "coverAlt": "",
    "authorName": "Equipo Cloud Esther",
    "authorRole": "",
    "status": "published",
    "featured": false,
    "publishedAt": "2026-10-24T12:00:00.000Z",
    "updatedAt": "2026-10-24T12:00:00.000Z"
  }
];
