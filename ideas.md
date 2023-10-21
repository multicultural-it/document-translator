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

#### Agente 2: Constructor de Parrafos

**Función:** Recibe el parrafo original y el array de nodos con sus traducciones, y devuelve el parrafo traducido con los nodos en el orden correcto.

**Input:** Parrafo original y array de nodos con su traducción e índice.

**Output:** Párrafo traducido con nodos ordenados basándose en sus índices.

**Ejemplo de Input:**

```json
{
  "paragraph": "This course can help you better understand LinkedIn Marketing Solutions’ paid products.",
  "nodes": [
    {
      "index": 0,
      "text": "This course can help you better understand ",
      "translation": "Este curso puede ayudarlo a comprender mejor"
    },
    {
      "index": 1,
      "text": "LinkedIn Marketing Solutions",
      "translation": "LinkedIn Marketing Solutions"
    },
    {
      "index": 2,
      "text": "’ paid products.",
      "translation": " los productos pagos."
    }
  ]
}
```

**Ejemplo de Output:**

```json
{
  "paragraph": "Este curso puede ayudarlo a comprender mejor los productos pagos de LinkedIn Marketing Solutions.",
  "nodes": [
    {
      "index": 1,
      "translation": "Este curso puede ayudarlo a comprender mejor"
    },
    {
      "indice": 3,
      "translation": "los productos pagos"
    },
    {
      "indice": 2,
      "translation": "de LinkedIn Marketing Solutions."
    }
  ]
}
```

✗ node src/index.js Spanish
Procesando nodo original con índice 0: {
'$': {
    'w:rsidDel': '00000000',
    'w:rsidR': '00000000',
    'w:rsidRPr': '00000000'
  },
  'w:rPr': [
    {
      'w:b': [Array],
      'w:sz': [Array],
      'w:szCs': [Array],
      'w:rtl': [Array]
    }
  ],
  'w:t': [ { _: 'TOPIC: Introduction to LinkedIn Ads', '$': [Object] } ]
}
Buscando nodo traducido con índice 0...
n {
"index": 0,
"translation": "TEMA: Introducción a los anuncios de LinkedIn"
}
nodeIndex 0
n.index 0
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 0. ¿Coincide con 0? true
Nodo traducido encontrado para índice 0: {
index: 0,
translation: 'TEMA: Introducción a los anuncios de LinkedIn'
}
Procesando nodo original con índice 0: {
'$': {
    'w:rsidDel': '00000000',
    'w:rsidR': '00000000',
    'w:rsidRPr': '00000000'
  },
  'w:rPr': [
    {
      'w:b': [Array],
      'w:sz': [Array],
      'w:szCs': [Array],
      'w:u': [Array],
      'w:rtl': [Array]
    }
  ],
  'w:t': [ { _: '1. Introduction', '$': [Object] } ]
}
Buscando nodo traducido con índice 0...
n {
"index": 0,
"translation": "1. Introducción"
}
nodeIndex 0
n.index 0
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 0. ¿Coincide con 0? true
Nodo traducido encontrado para índice 0: { index: 0, translation: '1. Introducción' }
Procesando nodo original con índice 0: {
'$': {
    'w:rsidDel': '00000000',
    'w:rsidR': '00000000',
    'w:rsidRPr': '00000000'
  },
  'w:rPr': [ { 'w:rtl': [Array] } ],
  'w:t': [
    { _: 'This course can help you better understand ', '$': [Object] }
]
}
Buscando nodo traducido con índice 0...
n {
"index": 1,
"translation": "Este curso puede ayudarte a comprender mejor "
}
nodeIndex 0
n.index 1
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 1. ¿Coincide con 0? false
Buscando nodo traducido con índice 0...
n {
"index": 2,
"translation": "los productos pagos de LinkedIn Marketing Solutions. "
}
nodeIndex 0
n.index 2
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 2. ¿Coincide con 0? false
Buscando nodo traducido con índice 0...
n {
"index": 3,
"translation": "Cuando termines, serás capaz de crear una campaña publicitaria utilizando el enfoque nativo de LinkedIn, medir tu éxito en Campaign Manager, y optimizar tus objetivos publicitarios. "
}
nodeIndex 0
n.index 3
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 3. ¿Coincide con 0? false
No se encontró nodo traducido para índice 0
Procesando nodo original con índice 1: {
'$': {
    'w:rsidDel': '00000000',
    'w:rsidR': '00000000',
    'w:rsidRPr': '00000000'
  },
  'w:rPr': [ { 'w:b': [Array], 'w:rtl': [Array] } ],
  'w:t': [ { _: 'LinkedIn Marketing Solutions’', '$': [Object] } ]
}
Buscando nodo traducido con índice 1...
n {
"index": 1,
"translation": "Este curso puede ayudarte a comprender mejor "
}
nodeIndex 1
n.index 1
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 1. ¿Coincide con 1? true
Nodo traducido encontrado para índice 1: {
index: 1,
translation: 'Este curso puede ayudarte a comprender mejor '
}
Procesando nodo original con índice 2: {
'$': {
    'w:rsidDel': '00000000',
    'w:rsidR': '00000000',
    'w:rsidRPr': '00000000'
  },
  'w:rPr': [ { 'w:rtl': [Array] } ],
  'w:t': [
    {
      _: " paid products. When you're done, you'll be able to create an ad campaign using LinkedIn’s native targeting, measure your success in Campaign Manager, and optimize your advertising goals.",
      '$': [Object]
}
]
}
Buscando nodo traducido con índice 2...
n {
"index": 1,
"translation": "Este curso puede ayudarte a comprender mejor "
}
nodeIndex 2
n.index 1
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 1. ¿Coincide con 2? false
Buscando nodo traducido con índice 2...
n {
"index": 2,
"translation": "los productos pagos de LinkedIn Marketing Solutions. "
}
nodeIndex 2
n.index 2
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 2. ¿Coincide con 2? true
Nodo traducido encontrado para índice 2: {
index: 2,
translation: 'los productos pagos de LinkedIn Marketing Solutions. '
}
Procesando nodo original con índice 0: {
'$': {
    'w:rsidDel': '00000000',
    'w:rsidR': '00000000',
    'w:rsidRPr': '00000000'
  },
  'w:rPr': [
    {
      'w:b': [Array],
      'w:sz': [Array],
      'w:szCs': [Array],
      'w:u': [Array],
      'w:rtl': [Array]
    }
  ],
  'w:t': [ { _: '3. Why Advertise on LinkedIn?', '$': [Object] } ]
}
Buscando nodo traducido con índice 0...
n {
"index": 0,
"translation": "3. ¿Por qué publicitar en LinkedIn?"
}
nodeIndex 0
n.index 0
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 0. ¿Coincide con 0? true
Nodo traducido encontrado para índice 0: { index: 0, translation: '3. ¿Por qué publicitar en LinkedIn?' }
Procesando nodo original con índice 0: {
'$': {
    'w:rsidDel': '00000000',
    'w:rsidR': '00000000',
    'w:rsidRPr': '00000000'
  },
  'w:rPr': [
    {
      'w:b': [Array],
      'w:color': [Array],
      'w:sz': [Array],
      'w:szCs': [Array],
      'w:u': [Array],
      'w:rtl': [Array]
    }
  ],
  'w:t': [ { _: 'Why Do Marketers Love LinkedIn?', '$': [Object] } ]
}
Buscando nodo traducido con índice 0...
n {
"index": 0,
"translation": "¿Por qué a los mercadólogos les encanta LinkedIn?"
}
nodeIndex 0
n.index 0
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 0. ¿Coincide con 0? true
Nodo traducido encontrado para índice 0: {
index: 0,
translation: '¿Por qué a los mercadólogos les encanta LinkedIn?'
}
Procesando nodo original con índice 0: {
'$': {
    'w:rsidDel': '00000000',
    'w:rsidR': '00000000',
    'w:rsidRPr': '00000000'
  },
  'w:rPr': [ { 'w:rtl': [Array] } ],
  'w:t': [
    {
      _: 'To understand how best to advertise on LinkedIn, it’s important to start with why. In this section, we’ll introduce the LinkedIn audience and environment and the reasons why marketers make LinkedIn a part of their advertising strategy.',
      '$': [Object]
}
]
}
Buscando nodo traducido con índice 0...
n {
"index": 1,
"translation": "Para entender cómo publicitar de manera óptima en LinkedIn, es fundamental comenzar con el por qué. "
}
nodeIndex 0
n.index 1
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 1. ¿Coincide con 0? false
Buscando nodo traducido con índice 0...
n {
"index": 2,
"translation": "En esta sección, presentaremos la audiencia y el entorno de LinkedIn y "
}
nodeIndex 0
n.index 2
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 2. ¿Coincide con 0? false
Buscando nodo traducido con índice 0...
n {
"index": 3,
"translation": "las razones por las que los especialistas en marketing incluyen LinkedIn en su estrategia publicitaria."
}
nodeIndex 0
n.index 3
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 3. ¿Coincide con 0? false
No se encontró nodo traducido para índice 0
Procesando nodo original con índice 0: {
'$': {
    'w:rsidDel': '00000000',
    'w:rsidR': '00000000',
    'w:rsidRPr': '00000000'
  },
  'w:rPr': [ { 'w:rtl': [Array] } ],
  'w:t': [
    {
      _: 'LinkedIn is home to the largest global community of professionals, from senior-level influencers to individual contributors. What’s more, people come to LinkedIn to invest time, not waste it. They’re here to learn, advance their careers, and connect with peers. It’s a platform ideally suited for marketers to connect with B2B and B2C buyers making relatively high-consideration decisions and purchases.',
      '$': [Object]
}
]
}
Buscando nodo traducido con índice 0...
n {
"index": 0,
"translation": "LinkedIn es el hogar de la mayor comunidad global de profesionales, desde influyentes de alto nivel hasta contribuyentes individuales. Además, la gente viene a LinkedIn para invertir tiempo, no para desperdiciarlo. Están aquí para aprender, avanzar en sus carreras y conectar con sus pares. Es una plataforma idealmente adecuada para que los comercializadores se conecten con compradores B2B y B2C que toman decisiones y compras de alta consideración."
}
nodeIndex 0
n.index 0
typeof nodeIndex number
type of n.index number
Nodo traducido actual con índice 0. ¿Coincide con 0? true
Nodo traducido encontrado para índice 0: {
index: 0,
translation: 'LinkedIn es el hogar de la mayor comunidad global de profesionales, desde influyentes de alto nivel hasta contribuyentes individuales. Además, la gente viene a LinkedIn para invertir tiempo, no para desperdiciarlo. Están aquí para aprender, avanzar en sus carreras y conectar con sus pares. Es una plataforma idealmente adecuada para que los comercializadores se conecten con compradores B2B y B2C que toman decisiones y compras de alta consideración.'
}
(base) ➜ documents-translator git:(master) ✗
