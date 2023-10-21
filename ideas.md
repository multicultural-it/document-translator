### Problema

Al traducir documentos `.docx`, estructurados como archivos XML con diferentes nodos internos, se presenta un desafío de consistencia en la traducción. Este desafío es más evidente cuando una oración se fragmenta en múltiples nodos debido a estilos de formato (como negrita, cursiva, etc.).

**Ejemplo:**

Oración original:

```
This course can help you better understand **LinkedIn Marketing Solutions’** paid products.
```

Aquí, "LinkedIn Marketing Solutions" está en negrita, lo que da como resultado 3 nodos en un documento Word. Al traducir nodo por nodo, el resultado puede ser:

```
"Este curso puede ayudarlo a comprender mejor LinkedIn Marketing Solutions’ los productos pagos."
```

### Incorporación de Índices a los Nodos

Para conservar la posición original de cada nodo, es esencial asignar un índice único a cada nodo. Este índice permitirá rastrear la posición original de cada nodo, incluso si su orden cambia durante el proceso de traducción.

```json
[
  {
    "indice": 1,
    "texto": "This course can help you better"
  },
  {
    "indice": 2,
    "texto": "LinkedIn Marketing Solutions"
  },
  {
    "indice": 3,
    "texto": " paid products"
  }
]
```

Este índice será crucial para reemplazar adecuadamente cada nodo traducido en el documento original.

### Propuesta de Solución

Proponemos dividir la tarea en dos agentes que trabajen en conjunto:

#### Agente 1: Traductor de Nodos

**Función:** Traduce cada nodo individualmente.

**Input:** Array de nodos originales.

**Output:** Array con nodos traducidos, conservando sus índices originales.

**Ejemplo de Output:**

```json
[
  {
    "indice": 1,
    "texto": "Este curso puede ayudarlo a comprender mejor"
  },
  {
    "indice": 2,
    "texto": "LinkedIn Marketing Solutions"
  },
  {
    "indice": 3,
    "texto": " los productos pagos"
  }
]
```

#### Agente 2: Constructor de Oraciones

**Función:** Recibe la oración original y el array de nodos con sus traducciones, y devuelve la oración traducida con los nodos en el orden correcto.

**Input:** Oración original y array de nodos con su traducción e índice.

**Output:** Oración traducida con nodos ordenados basándose en sus índices.

**Ejemplo de Output:**

```json
{
  "sentence": "Este curso puede ayudarlo a comprender mejor los productos pagos de LinkedIn Marketing Solutions.",
  "orderedNodes": [
    {
      "indice": 1,
      "correctedTranslation": "Este curso puede ayudarlo a comprender mejor"
    },
    {
      "indice": 3,
      "correctedTranslation": "los productos pagos"
    },
    {
      "indice": 2,
      "correctedTranslation": "de LinkedIn Marketing Solutions."
    }
  ]
}
```
