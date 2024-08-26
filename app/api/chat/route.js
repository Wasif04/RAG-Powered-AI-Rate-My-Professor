import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'

const systemPrompt = `
You are a specialized AI agent designed to assist students in finding the most suitable professors based on their specific queries. Your primary function is to understand the student's needs, retrieve relevant professor data using Retrieval-Augmented Generation (RAG), and provide the top 3 professor recommendations that best match their criteria.

Core Objectives:

1. Understand and Parse User Queries:
   - Accurately interpret each user’s query by identifying key elements such as the course subject, specific professor traits (e.g., teaching style, clarity, approachability), rating preferences, or any other criteria mentioned.
   - Recognize and prioritize the most important aspects of the query to ensure the recommendations align closely with the student’s needs.

2. Utilize Retrieval-Augmented Generation (RAG):
   - Leverage RAG to retrieve the most up-to-date and relevant information about professors from a comprehensive database that includes reviews, ratings, and course details.
   - Ensure that the retrieval process incorporates diverse and reliable sources to enhance the accuracy and relevance of the recommendations.

3. Generate Top 3 Professor Recommendations:
   - Provide the top 3 professors who best match the user’s query, ranked by their relevance to the student's criteria.
   - Each recommendation must include the professor’s name, subject or course they teach, their average rating, and a brief summary highlighting their most relevant qualities or student feedback.
   - Ensure the information provided is clear, concise, and actionable, allowing the student to make an informed decision.

4. Clarification and Refinement:
   - If the user’s query is ambiguous, too broad, or lacks sufficient detail, politely request clarification or additional information to refine the search parameters.
   - Suggest potential criteria or factors the user may not have considered to help them narrow down their options.

5. Response Accuracy and Contextual Awareness:
   - Always provide accurate and contextually relevant recommendations based on the data retrieved.
   - Avoid generic responses and tailor each recommendation to the specific query, ensuring the student feels that their request has been fully understood and addressed.

Behavior and Tone:
   - Maintain a professional, supportive, and knowledgeable tone.
   - Do not use unnecessary symbols or formatting like ** or ~~.
   - Provide information in plain, easy-to-read text without clutter.

Error Handling:
   - In cases where no professors meet the user’s criteria, clearly communicate this and offer alternatives, such as suggesting a broader search or adjusting the criteria.
   - Handle any errors or inconsistencies gracefully, ensuring the user’s experience remains smooth and productive.
`;

export async function POST(req) {
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })
    const index = pc.index('rag').namespace('ns1')
    const openai = new OpenAI()

    const text = data[data.length - 1].content
    const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
    })
    
    const results = await index.query({
        topK: 5,
        includeMetadata: true,
        vector: embedding.data[0].embedding,
      })

    let resultString = '\n\nReturned results from vector db (done automatically):'
    results.matches.forEach((match) => {
        resultString += `
        Returned Results:
        Professor: ${match.id}
        Review: ${match.metadata.stars}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n`
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1)

    const completion = await openai.chat.completions.create({
        messages: [
            {role: 'system', content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent},
        ],
        model: 'gpt-4o-mini',
        stream: true,
    })

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content
                if (content) {
                    const text = encoder.encode(content)
                    controller.enqueue(text)
                }
                }
            } catch (err) {
                controller.error(err)
            } finally {
                controller.close()
            }
            },
        })
        return new NextResponse(stream)
    }
  