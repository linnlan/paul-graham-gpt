import React, { useState, useEffect } from "react";
import styles from "./answer.module.css";

interface AnswerProps {
    text: string;
}

export const Answer: React.FC<AnswerProps> = ({ text }) => {
    const [words, setWords] = useState<string[]>([]);

    useEffect(()=>{
        setWords(text.split(" "));
    },[text]);

    return (
        <div>
            {words.map((word,index)=>( //for the chatgpt like rendering of response
                <span 
                    key={index}
                    className={styles.fadeIn}
                    style={{ animationDelay: `${index*0.01}s`}}
                >
                    {word}{" "}
                </span>
            ))}
        </div>
    );
};