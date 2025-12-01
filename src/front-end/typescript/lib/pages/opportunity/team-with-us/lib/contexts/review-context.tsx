import React from "react";

export interface ReviewContextType {
  reviewInProgress: React.MutableRefObject<boolean>;
}

export const ReviewContext = React.createContext<ReviewContextType | null>(
  null
);

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const reviewInProgress = React.useRef(false);

  return (
    <ReviewContext.Provider value={{ reviewInProgress }}>
      {children}
    </ReviewContext.Provider>
  );
};

export const useReviewContext = (): ReviewContextType => {
  const context = React.useContext(ReviewContext);
  if (!context) {
    throw new Error("useReviewContext must be used within ReviewProvider");
  }
  return context;
};
