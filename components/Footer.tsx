import { IconBrandGithub } from "@tabler/icons-react";
import { FC } from "react";

export const Footer: FC = () => {
    return (
        <div className = "flex h-[50px] border-t border-gray-300 py-2 px-8 items-center sm:justify-between justify-center">
            <div className="hidden sm:flex"></div>
            <div className="hidden sm:flex italic text-sm">
                <a
                    className="hover:opacity-50 m1-1"
                    href="https://twitter.com/paulg"
                    target="_blank"
                    rel="noreferrer"
                >
                Paul Graham
                </a>
            </div>
            <div className="flex space-x-4">
                <a
                    className="flex items-center hover:opacity-50"
                    href="https://github.com/"
                    target="_blank"
                    rel="noreferrer"
                >
                    <IconBrandGithub size={24}/>
                </a>
            </div>
        </div>
    );
};